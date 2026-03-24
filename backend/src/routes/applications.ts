import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface CreateApplicationInput {
  application_type: 'id' | 'passport';
  application_subtype: 'new' | 'renewal';
  is_minor: boolean;
}

interface ApplicationDetailInput {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  place_of_birth_city?: string;
  place_of_birth_province?: string;
  place_of_birth_country?: string;
  address_house?: string;
  address_street?: string;
  address_suburb?: string;
  address_city?: string;
  address_province?: string;
  address_country?: string;
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  id_number?: string;
  guardian_name?: string;
  guardian_surname?: string;
  guardian_id_number?: string;
  birth_certificate_number?: string;
  birth_certificate_url?: string;
}

interface PaymentInput {
  payment_method: 'absa' | 'capitec' | 'standard_bank' | 'fnb' | 'discovery';
}

export function registerApplicationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get('/api/applications', {
    schema: {
      description: 'Get all applications for the authenticated user',
      tags: ['applications'],
      response: {
        200: {
          type: 'object',
          properties: {
            applications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  application_type: { type: 'string' },
                  application_subtype: { type: 'string' },
                  is_minor: { type: 'boolean' },
                  status: { type: 'string' },
                  reference_number: { type: 'string' },
                  fee_amount: { type: 'string' },
                  fee_paid: { type: 'boolean' },
                  payment_method: { type: ['string', 'null'] },
                  submitted_at: { type: ['string', 'null'], format: 'date-time' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Getting all applications');

    const applications = await app.db.query.applications.findMany({
      where: eq(schema.applications.userId, session.user.id),
    });

    app.logger.info({ userId: session.user.id, count: applications.length }, 'Applications retrieved');
    return reply.send({
      applications: applications.map(convertApplicationToListResponse),
    });
  });

  app.fastify.post('/api/applications', {
    schema: {
      description: 'Create a new application',
      tags: ['applications'],
      body: {
        type: 'object',
        required: ['application_type', 'application_subtype', 'is_minor'],
        properties: {
          application_type: { type: 'string', enum: ['id', 'passport'] },
          application_subtype: { type: 'string', enum: ['new', 'renewal'] },
          is_minor: { type: 'boolean' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string' },
            application_type: { type: 'string' },
            application_subtype: { type: 'string' },
            status: { type: 'string' },
            reference_number: { type: 'string' },
            fee_amount: { type: 'string' },
            details: { type: 'object' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateApplicationInput }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, body: request.body }, 'Creating new application');

    const feeAmount = calculateFeeAmount(request.body.application_type, request.body.application_subtype);
    const referenceNumber = generateReferenceNumber(request.body.application_type);

    const userProfile = await app.db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.userId, session.user.id),
    });

    const [application] = await app.db
      .insert(schema.applications)
      .values({
        userId: session.user.id,
        applicationType: request.body.application_type,
        applicationSubtype: request.body.application_subtype,
        isMinor: request.body.is_minor,
        status: 'draft',
        referenceNumber: referenceNumber,
        feeAmount: feeAmount.toString(),
        feePaid: false,
      })
      .returning();

    let details;
    if (userProfile) {
      const [created] = await app.db
        .insert(schema.applicationDetails)
        .values({
          applicationId: application.id,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          dateOfBirth: userProfile.dateOfBirth,
          placeOfBirthCity: userProfile.placeOfBirthCity,
          placeOfBirthProvince: userProfile.placeOfBirthProvince,
          placeOfBirthCountry: userProfile.placeOfBirthCountry,
          addressHouse: userProfile.addressHouse,
          addressStreet: userProfile.addressStreet,
          addressSuburb: userProfile.addressSuburb,
          addressCity: userProfile.addressCity,
          addressProvince: userProfile.addressProvince,
          addressCountry: userProfile.addressCountry,
          phonePrimary: userProfile.phonePrimary,
          phoneSecondary: userProfile.phoneSecondary,
          email: userProfile.email,
          idNumber: userProfile.idNumber,
        })
        .returning();
      details = created;
    } else {
      const [created] = await app.db
        .insert(schema.applicationDetails)
        .values({
          applicationId: application.id,
        })
        .returning();
      details = created;
    }

    app.logger.info({ userId: session.user.id, applicationId: application.id }, 'Application created');
    return reply.status(201).send(convertApplicationToResponse(application, details));
  });

  app.fastify.get('/api/applications/:id', {
    schema: {
      description: 'Get a specific application',
      tags: ['applications'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            details: { type: 'object' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, applicationId: request.params.id }, 'Getting application');

    const application = await app.db.query.applications.findFirst({
      where: eq(schema.applications.id, request.params.id),
    });

    if (!application) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Application not found');
      return reply.status(404).send({ error: 'Application not found' });
    }

    if (application.userId !== session.user.id) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id, ownerId: application.userId }, 'Unauthorized access to application');
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    const details = await app.db.query.applicationDetails.findFirst({
      where: eq(schema.applicationDetails.applicationId, application.id),
    });

    app.logger.info({ userId: session.user.id, applicationId: application.id }, 'Application retrieved');
    return reply.send(convertApplicationToResponse(application, details!));
  });

  app.fastify.put('/api/applications/:id', {
    schema: {
      description: 'Update application details',
      tags: ['applications'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          date_of_birth: { type: 'string' },
          place_of_birth_city: { type: 'string' },
          place_of_birth_province: { type: 'string' },
          place_of_birth_country: { type: 'string' },
          address_house: { type: 'string' },
          address_street: { type: 'string' },
          address_suburb: { type: 'string' },
          address_city: { type: 'string' },
          address_province: { type: 'string' },
          address_country: { type: 'string' },
          phone_primary: { type: 'string' },
          phone_secondary: { type: 'string' },
          email: { type: 'string' },
          id_number: { type: 'string' },
          guardian_name: { type: 'string' },
          guardian_surname: { type: 'string' },
          guardian_id_number: { type: 'string' },
          birth_certificate_number: { type: 'string' },
          birth_certificate_url: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            details: { type: 'object' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: ApplicationDetailInput }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, applicationId: request.params.id, body: request.body }, 'Updating application details');

    const application = await app.db.query.applications.findFirst({
      where: eq(schema.applications.id, request.params.id),
    });

    if (!application) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Application not found');
      return reply.status(404).send({ error: 'Application not found' });
    }

    if (application.userId !== session.user.id) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Unauthorized access to application');
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    const existingDetails = await app.db.query.applicationDetails.findFirst({
      where: eq(schema.applicationDetails.applicationId, application.id),
    });

    const updateData: any = { updatedAt: new Date() };
    if (request.body.first_name !== undefined) updateData.firstName = request.body.first_name;
    if (request.body.last_name !== undefined) updateData.lastName = request.body.last_name;
    if (request.body.date_of_birth !== undefined) updateData.dateOfBirth = request.body.date_of_birth;
    if (request.body.place_of_birth_city !== undefined) updateData.placeOfBirthCity = request.body.place_of_birth_city;
    if (request.body.place_of_birth_province !== undefined) updateData.placeOfBirthProvince = request.body.place_of_birth_province;
    if (request.body.place_of_birth_country !== undefined) updateData.placeOfBirthCountry = request.body.place_of_birth_country;
    if (request.body.address_house !== undefined) updateData.addressHouse = request.body.address_house;
    if (request.body.address_street !== undefined) updateData.addressStreet = request.body.address_street;
    if (request.body.address_suburb !== undefined) updateData.addressSuburb = request.body.address_suburb;
    if (request.body.address_city !== undefined) updateData.addressCity = request.body.address_city;
    if (request.body.address_province !== undefined) updateData.addressProvince = request.body.address_province;
    if (request.body.address_country !== undefined) updateData.addressCountry = request.body.address_country;
    if (request.body.phone_primary !== undefined) updateData.phonePrimary = request.body.phone_primary;
    if (request.body.phone_secondary !== undefined) updateData.phoneSecondary = request.body.phone_secondary;
    if (request.body.email !== undefined) updateData.email = request.body.email;
    if (request.body.id_number !== undefined) updateData.idNumber = request.body.id_number;
    if (request.body.guardian_name !== undefined) updateData.guardianName = request.body.guardian_name;
    if (request.body.guardian_surname !== undefined) updateData.guardianSurname = request.body.guardian_surname;
    if (request.body.guardian_id_number !== undefined) updateData.guardianIdNumber = request.body.guardian_id_number;
    if (request.body.birth_certificate_number !== undefined) updateData.birthCertificateNumber = request.body.birth_certificate_number;
    if (request.body.birth_certificate_url !== undefined) updateData.birthCertificateUrl = request.body.birth_certificate_url;

    const [updatedDetails] = await app.db
      .update(schema.applicationDetails)
      .set(updateData)
      .where(eq(schema.applicationDetails.applicationId, application.id))
      .returning();

    app.logger.info({ userId: session.user.id, applicationId: application.id }, 'Application details updated');
    return reply.send(convertApplicationToResponse(application, updatedDetails));
  });

  app.fastify.post('/api/applications/:id/submit', {
    schema: {
      description: 'Submit an application',
      tags: ['applications'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, applicationId: request.params.id }, 'Submitting application');

    const application = await app.db.query.applications.findFirst({
      where: eq(schema.applications.id, request.params.id),
    });

    if (!application) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Application not found');
      return reply.status(404).send({ error: 'Application not found' });
    }

    if (application.userId !== session.user.id) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Unauthorized access to application');
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    const feeAmount = parseFloat(application.feeAmount as string);
    if (feeAmount > 0 && !application.feePaid) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Payment required before submission');
      return reply.status(400).send({ error: 'Payment required before submission' });
    }

    const [updated] = await app.db
      .update(schema.applications)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, application.id))
      .returning();

    await app.db
      .insert(schema.statusUpdates)
      .values({
        applicationId: application.id,
        status: 'submitted',
        message: 'Application submitted successfully',
      });

    const details = await app.db.query.applicationDetails.findFirst({
      where: eq(schema.applicationDetails.applicationId, application.id),
    });

    app.logger.info({ userId: session.user.id, applicationId: application.id }, 'Application submitted');
    return reply.send(convertApplicationToResponse(updated, details!));
  });

  app.fastify.post('/api/applications/:id/payment', {
    schema: {
      description: 'Process payment for an application',
      tags: ['applications'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['payment_method'],
        properties: {
          payment_method: { type: 'string', enum: ['absa', 'capitec', 'standard_bank', 'fnb', 'discovery'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            payment_reference: { type: ['string', 'null'] },
            application: { type: 'object' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: PaymentInput }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, applicationId: request.params.id, paymentMethod: request.body.payment_method }, 'Processing payment');

    const application = await app.db.query.applications.findFirst({
      where: eq(schema.applications.id, request.params.id),
    });

    if (!application) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Application not found');
      return reply.status(404).send({ error: 'Application not found' });
    }

    if (application.userId !== session.user.id) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Unauthorized access to application');
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    const feeAmount = parseFloat(application.feeAmount as string);
    let paymentReference: string | null = null;

    if (feeAmount === 0) {
      const details = await app.db.query.applicationDetails.findFirst({
        where: eq(schema.applicationDetails.applicationId, application.id),
      });

      app.logger.info({ userId: session.user.id, applicationId: request.params.id }, 'No payment required');
      return reply.send({
        success: true,
        payment_reference: null,
        application: convertApplicationToResponse(application, details!),
      });
    }

    paymentReference = generatePaymentReference();

    const [updated] = await app.db
      .update(schema.applications)
      .set({
        feePaid: true,
        paymentMethod: request.body.payment_method,
        paymentReference: paymentReference,
        paymentDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, application.id))
      .returning();

    await app.db
      .insert(schema.statusUpdates)
      .values({
        applicationId: application.id,
        status: application.status,
        message: 'Payment received',
      });

    const details = await app.db.query.applicationDetails.findFirst({
      where: eq(schema.applicationDetails.applicationId, application.id),
    });

    app.logger.info({ userId: session.user.id, applicationId: application.id, paymentReference }, 'Payment processed');
    return reply.send({
      success: true,
      payment_reference: paymentReference,
      application: convertApplicationToResponse(updated, details!),
    });
  });

  app.fastify.get('/api/applications/:id/status', {
    schema: {
      description: 'Get status updates for an application',
      tags: ['applications'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status_updates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  application_id: { type: 'string', format: 'uuid' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, applicationId: request.params.id }, 'Getting status updates');

    const application = await app.db.query.applications.findFirst({
      where: eq(schema.applications.id, request.params.id),
    });

    if (!application) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Application not found');
      return reply.status(404).send({ error: 'Application not found' });
    }

    if (application.userId !== session.user.id) {
      app.logger.warn({ userId: session.user.id, applicationId: request.params.id }, 'Unauthorized access to application');
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    const updates = await app.db.query.statusUpdates.findMany({
      where: eq(schema.statusUpdates.applicationId, application.id),
      orderBy: (updates, { asc }) => [asc(updates.createdAt)],
    });

    app.logger.info({ userId: session.user.id, applicationId: application.id, count: updates.length }, 'Status updates retrieved');
    return reply.send({
      status_updates: updates.map(convertStatusUpdateToResponse),
    });
  });
}

function calculateFeeAmount(applicationType: string, applicationSubtype: string): number {
  if (applicationType === 'id') {
    if (applicationSubtype === 'new') {
      return 0;
    } else if (applicationSubtype === 'renewal') {
      return 140;
    }
  } else if (applicationType === 'passport') {
    return 600;
  }
  return 0;
}

function generateReferenceNumber(applicationType: string): string {
  const year = new Date().getFullYear();
  const randomChars = Array.from({ length: 6 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
  ).join('');
  const prefix = applicationType === 'id' ? 'ID' : 'PP';
  return `${prefix}-${year}-${randomChars}`;
}

function generatePaymentReference(): string {
  const randomChars = Array.from({ length: 6 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
  ).join('');
  return `PAY-${randomChars}`;
}

function convertApplicationToResponse(application: any, details: any) {
  return {
    id: application.id,
    user_id: application.userId,
    application_type: application.applicationType,
    application_subtype: application.applicationSubtype,
    is_minor: application.isMinor,
    status: application.status,
    reference_number: application.referenceNumber,
    fee_amount: application.feeAmount,
    fee_paid: application.feePaid,
    payment_method: application.paymentMethod || null,
    payment_reference: application.paymentReference || null,
    payment_date: application.paymentDate ? application.paymentDate.toISOString() : null,
    submitted_at: application.submittedAt ? application.submittedAt.toISOString() : null,
    created_at: application.createdAt.toISOString(),
    updated_at: application.updatedAt.toISOString(),
    details: {
      id: details.id,
      application_id: details.applicationId,
      first_name: details.firstName || null,
      last_name: details.lastName || null,
      date_of_birth: details.dateOfBirth || null,
      place_of_birth_city: details.placeOfBirthCity || null,
      place_of_birth_province: details.placeOfBirthProvince || null,
      place_of_birth_country: details.placeOfBirthCountry || null,
      address_house: details.addressHouse || null,
      address_street: details.addressStreet || null,
      address_suburb: details.addressSuburb || null,
      address_city: details.addressCity || null,
      address_province: details.addressProvince || null,
      address_country: details.addressCountry || null,
      phone_primary: details.phonePrimary || null,
      phone_secondary: details.phoneSecondary || null,
      email: details.email || null,
      id_number: details.idNumber || null,
      guardian_name: details.guardianName || null,
      guardian_surname: details.guardianSurname || null,
      guardian_id_number: details.guardianIdNumber || null,
      birth_certificate_number: details.birthCertificateNumber || null,
      birth_certificate_url: details.birthCertificateUrl || null,
      created_at: details.createdAt.toISOString(),
      updated_at: details.updatedAt.toISOString(),
    },
  };
}

function convertApplicationToListResponse(application: any) {
  return {
    id: application.id,
    application_type: application.applicationType,
    application_subtype: application.applicationSubtype,
    is_minor: application.isMinor,
    status: application.status,
    reference_number: application.referenceNumber,
    fee_amount: application.feeAmount,
    fee_paid: application.feePaid,
    payment_method: application.paymentMethod || null,
    submitted_at: application.submittedAt ? application.submittedAt.toISOString() : null,
    created_at: application.createdAt.toISOString(),
  };
}

function convertStatusUpdateToResponse(update: any) {
  return {
    id: update.id,
    application_id: update.applicationId,
    status: update.status,
    message: update.message,
    created_at: update.createdAt.toISOString(),
  };
}

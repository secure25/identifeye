import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface UserProfileInput {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  place_of_birth_city?: string;
  place_of_birth_province?: string;
  place_of_birth_country?: string;
  address_house?: string;
  address_street?: string;
  address_suburb?: string;
  address_city?: string;
  address_province?: string;
  address_country?: string;
  phone_primary: string;
  phone_secondary?: string;
  email: string;
  id_number?: string;
  language_preference?: string;
}

interface LanguageInput {
  language: string;
}

export function registerProfileRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get('/api/profile', {
    schema: {
      description: 'Get the authenticated user\'s profile',
      tags: ['profile'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string' },
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
            phone_secondary: { type: ['string', 'null'] },
            email: { type: 'string' },
            id_number: { type: ['string', 'null'] },
            language_preference: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Getting user profile');

    const profile = await app.db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.userId, session.user.id),
    });

    if (!profile) {
      app.logger.warn({ userId: session.user.id }, 'Profile not found');
      return reply.status(404).send({ error: 'Profile not found' });
    }

    app.logger.info({ userId: session.user.id, profileId: profile.id }, 'Profile retrieved');
    return reply.send(convertProfileToResponse(profile));
  });

  app.fastify.post('/api/profile', {
    schema: {
      description: 'Create or update the authenticated user\'s profile',
      tags: ['profile'],
      body: {
        type: 'object',
        required: ['first_name', 'last_name', 'date_of_birth', 'phone_primary', 'email'],
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
          language_preference: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
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
      },
    },
  }, async (request: FastifyRequest<{ Body: UserProfileInput }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, body: request.body }, 'Upserting user profile');

    const existingProfile = await app.db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.userId, session.user.id),
    });

    let profile;
    const updateData = {
      firstName: request.body.first_name,
      lastName: request.body.last_name,
      dateOfBirth: request.body.date_of_birth,
      placeOfBirthCity: request.body.place_of_birth_city,
      placeOfBirthProvince: request.body.place_of_birth_province,
      placeOfBirthCountry: request.body.place_of_birth_country,
      addressHouse: request.body.address_house,
      addressStreet: request.body.address_street,
      addressSuburb: request.body.address_suburb,
      addressCity: request.body.address_city,
      addressProvince: request.body.address_province,
      addressCountry: request.body.address_country,
      phonePrimary: request.body.phone_primary,
      phoneSecondary: request.body.phone_secondary,
      email: request.body.email,
      idNumber: request.body.id_number,
      languagePreference: request.body.language_preference || 'en',
      updatedAt: new Date(),
    };

    if (existingProfile) {
      const [updated] = await app.db
        .update(schema.userProfiles)
        .set(updateData)
        .where(eq(schema.userProfiles.userId, session.user.id))
        .returning();
      profile = updated;
      app.logger.info({ userId: session.user.id, profileId: profile.id }, 'Profile updated');
    } else {
      const [created] = await app.db
        .insert(schema.userProfiles)
        .values({
          userId: session.user.id,
          ...updateData,
        })
        .returning();
      profile = created;
      app.logger.info({ userId: session.user.id, profileId: profile.id }, 'Profile created');
    }

    return reply.send(convertProfileToResponse(profile));
  });

  app.fastify.put('/api/profile/language', {
    schema: {
      description: 'Update language preference',
      tags: ['profile'],
      body: {
        type: 'object',
        required: ['language'],
        properties: {
          language: { type: 'string', enum: ['en', 'af', 'zu', 'xh'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            language: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: LanguageInput }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, language: request.body.language }, 'Updating language preference');

    const profile = await app.db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.userId, session.user.id),
    });

    if (!profile) {
      app.logger.warn({ userId: session.user.id }, 'Profile not found for language update');
      return reply.status(404).send({ error: 'Profile not found' });
    }

    await app.db
      .update(schema.userProfiles)
      .set({
        languagePreference: request.body.language,
        updatedAt: new Date(),
      })
      .where(eq(schema.userProfiles.userId, session.user.id));

    app.logger.info({ userId: session.user.id, language: request.body.language }, 'Language preference updated');
    return reply.send({ language: request.body.language });
  });
}

function convertProfileToResponse(profile: any) {
  return {
    id: profile.id,
    user_id: profile.userId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    date_of_birth: profile.dateOfBirth,
    place_of_birth_city: profile.placeOfBirthCity || null,
    place_of_birth_province: profile.placeOfBirthProvince || null,
    place_of_birth_country: profile.placeOfBirthCountry || null,
    address_house: profile.addressHouse || null,
    address_street: profile.addressStreet || null,
    address_suburb: profile.addressSuburb || null,
    address_city: profile.addressCity || null,
    address_province: profile.addressProvince || null,
    address_country: profile.addressCountry || null,
    phone_primary: profile.phonePrimary,
    phone_secondary: profile.phoneSecondary || null,
    email: profile.email,
    id_number: profile.idNumber || null,
    language_preference: profile.languagePreference,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };
}

import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mock Home Affairs database — pre-seeded citizens
// In production this would call the real DHA API
const MOCK_HOME_AFFAIRS_DB: Record<string, {
  id_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  status: 'active' | 'deceased' | 'flagged';
}> = {
  '9001015009087': {
    id_number: '9001015009087',
    first_name: 'Thabo',
    last_name: 'Nkosi',
    date_of_birth: '1990-01-01',
    gender: 'M',
    status: 'active',
  },
  '8505120123456': {
    id_number: '8505120123456',
    first_name: 'Nomsa',
    last_name: 'Dlamini',
    date_of_birth: '1985-05-12',
    gender: 'F',
    status: 'active',
  },
  '9507234567890': {
    id_number: '9507234567890',
    first_name: 'Sipho',
    last_name: 'Zulu',
    date_of_birth: '1995-07-23',
    gender: 'M',
    status: 'active',
  },
  '0203156789012': {
    id_number: '0203156789012',
    first_name: 'Ayanda',
    last_name: 'Mokoena',
    date_of_birth: '2002-03-15',
    gender: 'F',
    status: 'active',
  },
  '7812089876543': {
    id_number: '7812089876543',
    first_name: 'Johannes',
    last_name: 'van der Merwe',
    date_of_birth: '1978-12-08',
    gender: 'M',
    status: 'active',
  },
  // Demo user — use this ID to test the full flow
  '0000000000000': {
    id_number: '0000000000000',
    first_name: 'Demo',
    last_name: 'User',
    date_of_birth: '2000-01-01',
    gender: 'M',
    status: 'active',
  },
};

interface VerifyIdentityInput {
  id_number: string;
  first_name: string;
  last_name: string;
  face_photo: string;
}

export function registerHomeAffairsRoutes(app: App) {
  // Verify identity against mock Home Affairs database
  app.fastify.post('/api/home-affairs/verify', {
    schema: {
      description: 'Verify identity against Home Affairs database (mock)',
      tags: ['home-affairs'],
      body: {
        type: 'object',
        required: ['id_number', 'first_name', 'last_name', 'face_photo'],
        properties: {
          id_number: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          face_photo: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            verified: { type: 'boolean' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            id_number: { type: 'string' },
            date_of_birth: { type: 'string' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: VerifyIdentityInput }>, reply: FastifyReply) => {
    const { id_number, first_name, last_name, face_photo } = request.body;

    app.logger.info({ id_number, first_name, last_name }, 'Verifying identity against Home Affairs database');

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Look up by ID number first
    const citizen = MOCK_HOME_AFFAIRS_DB[id_number];

    if (!citizen) {
      app.logger.warn({ id_number }, 'ID number not found in Home Affairs database');
      return reply.status(200).send({
        verified: false,
        message: 'ID number not found in the Home Affairs database. Please check your ID number and try again.',
      });
    }

    if (citizen.status !== 'active') {
      return reply.status(200).send({
        verified: false,
        message: 'This ID record is not eligible for registration.',
      });
    }

    // Cross-reference name and surname (case-insensitive)
    const nameMatch =
      citizen.first_name.toLowerCase() === first_name.trim().toLowerCase() &&
      citizen.last_name.toLowerCase() === last_name.trim().toLowerCase();

    if (!nameMatch) {
      app.logger.warn({ id_number }, 'Name/surname mismatch');
      return reply.status(200).send({
        verified: false,
        message: 'Name or surname does not match the record for this ID number. Please check your details.',
      });
    }

    // Face photo is required — mock facial recognition accepts any photo
    app.logger.info({ id_number }, 'Mock facial recognition: photo accepted');

    app.logger.info({ id_number }, 'Identity verified successfully');
    return reply.send({
      verified: true,
      first_name: citizen.first_name,
      last_name: citizen.last_name,
      id_number: citizen.id_number,
      date_of_birth: citizen.date_of_birth,
      message: 'Identity verified successfully',
    });
  });

  // Get list of mock citizens (for demo/testing purposes only)
  app.fastify.get('/api/home-affairs/demo-ids', {
    schema: {
      description: 'Get demo ID numbers for testing (remove in production)',
      tags: ['home-affairs'],
      response: {
        200: {
          type: 'object',
          properties: {
            demo_ids: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id_number: { type: 'string' },
                  name: { type: 'string' },
                  date_of_birth: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      demo_ids: Object.values(MOCK_HOME_AFFAIRS_DB).map(c => ({
        id_number: c.id_number,
        name: `${c.first_name} ${c.last_name}`,
        date_of_birth: c.date_of_birth,
      })),
    });
  });
}

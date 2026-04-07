import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '../config';
import { Role } from '../utils/roles';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    authorize: (roles: Role[]) => (request: any, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    user: {
      id: number;
      type: Role;
    };
  }
}

export default fp(async (fastify) => {
  fastify.register(jwt, { secret: config.jwtSecret });

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  fastify.decorate('authorize', (roles: Role[]) => {
    return async (request, reply) => {
      await fastify.authenticate(request, reply);
      if (!request.user || !roles.includes(request.user.type)) {
        return reply.code(403).send({ message: 'Forbidden' });
      }
    };
  });
});

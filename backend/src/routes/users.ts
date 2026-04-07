import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { hashPassword } from '../utils/password';
import { ROLE } from '../utils/roles';

const createUserSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(6),
  type: z.number().int().min(0).max(2),
  active: z.number().int().min(0).max(1).default(1),
  service_ids: z.array(z.number().int()).default([])
});

const updateUserSchema = z.object({
  login: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  type: z.number().int().min(0).max(2).optional(),
  active: z.number().int().min(0).max(1).optional(),
  service_ids: z.array(z.number().int()).optional()
});

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users', { preHandler: fastify.authorize([ROLE.admin]) }, async () => {
    const users = await db('users').select('id', 'login', 'type', 'active', 'created_at');
    const relations = await db('user_services').select('user_id', 'service_id');

    const servicesByUser = relations.reduce<Record<number, number[]>>((acc, row) => {
      acc[row.user_id] = acc[row.user_id] || [];
      acc[row.user_id].push(row.service_id);
      return acc;
    }, {});

    return users.map((user) => ({
      ...user,
      service_ids: servicesByUser[user.id] || []
    }));
  });

  fastify.get('/users/:id', { preHandler: fastify.authorize([ROLE.admin]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const user = await db('users').select('id', 'login', 'type', 'active', 'created_at').where({ id }).first();
    if (!user) {
      return reply.code(404).send({ message: 'User not found' });
    }

    const serviceIds = await db('user_services').where({ user_id: id }).pluck('service_id');
    return { ...user, service_ids: serviceIds };
  });

  fastify.post('/users', { preHandler: fastify.authorize([ROLE.admin]) }, async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const passwordHash = await hashPassword(body.password);

    const [id] = await db('users').insert({
      login: body.login,
      password_hash: passwordHash,
      type: body.type,
      active: body.active
    });

    if (body.service_ids.length > 0) {
      await db('user_services').insert(body.service_ids.map((serviceId) => ({
        user_id: id,
        service_id: serviceId
      })));
    }

    reply.code(201).send({ id });
  });

  fastify.put('/users/:id', { preHandler: fastify.authorize([ROLE.admin]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const body = updateUserSchema.parse(request.body);

    const patch: Record<string, any> = {};
    if (body.login !== undefined) patch.login = body.login;
    if (body.type !== undefined) patch.type = body.type;
    if (body.active !== undefined) patch.active = body.active;
    if (body.password) patch.password_hash = await hashPassword(body.password);

    if (Object.keys(patch).length > 0) {
      await db('users').where({ id }).update(patch);
    }

    if (body.service_ids) {
      await db('user_services').where({ user_id: id }).del();
      if (body.service_ids.length > 0) {
        await db('user_services').insert(body.service_ids.map((serviceId) => ({
          user_id: id,
          service_id: serviceId
        })));
      }
    }

    reply.send({ id });
  });

  fastify.patch('/users/:id/active', { preHandler: fastify.authorize([ROLE.admin]) }, async (request) => {
    const id = Number((request.params as any).id);
    const body = z.object({ active: z.number().int().min(0).max(1) }).parse(request.body);
    await db('users').where({ id }).update({ active: body.active });
    return { id };
  });
}

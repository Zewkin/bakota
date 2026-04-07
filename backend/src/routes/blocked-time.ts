import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { ROLE } from '../utils/roles';

const blockedSchema = z.object({
  service_id: z.number().int(),
  start: z.string().min(1),
  blocked_hours: z.number().positive(),
  comments: z.string().optional()
});

export async function blockedTimeRoutes(fastify: FastifyInstance) {
  fastify.get('/blocked-time', { preHandler: fastify.authenticate }, async (request) => {
    const { service_id } = request.query as any;
    const query = db('blocked_time').select('*');
    if (service_id) query.where({ service_id: Number(service_id) });
    return query.orderBy('start', 'asc');
  });

  fastify.post('/blocked-time', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request, reply) => {
    const body = blockedSchema.parse(request.body);
    const [id] = await db('blocked_time').insert({
      service_id: body.service_id,
      start: body.start,
      blocked_hours: body.blocked_hours,
      comments: body.comments || null
    });
    reply.code(201).send({ id });
  });

  fastify.delete('/blocked-time/:id', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request) => {
    const id = Number((request.params as any).id);
    await db('blocked_time').where({ id }).del();
    return { id };
  });
}

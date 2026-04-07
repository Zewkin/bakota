import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { ROLE } from '../utils/roles';

const commissionSchema = z.object({
  user_id: z.number().int(),
  product_id: z.number().int(),
  commission: z.number().int().min(0).max(100)
});

export async function commissionRoutes(fastify: FastifyInstance) {
  fastify.get('/commissions', { preHandler: fastify.authorize([ROLE.admin]) }, async (request) => {
    const { user_id, product_id } = request.query as any;
    const query = db('commissions').select('*');
    if (user_id) query.where({ user_id: Number(user_id) });
    if (product_id) query.where({ product_id: Number(product_id) });
    return query;
  });

  fastify.post('/commissions', { preHandler: fastify.authorize([ROLE.admin]) }, async (request, reply) => {
    const body = commissionSchema.parse(request.body);
    const existing = await db('commissions').where({ user_id: body.user_id, product_id: body.product_id }).first();
    if (existing) {
      await db('commissions').where({ id: existing.id }).update({ commission: body.commission });
      return reply.send({ id: existing.id });
    }
    const [id] = await db('commissions').insert(body);
    reply.code(201).send({ id });
  });

  fastify.put('/commissions/:id', { preHandler: fastify.authorize([ROLE.admin]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const body = commissionSchema.partial().parse(request.body);
    await db('commissions').where({ id }).update(body);
    reply.send({ id });
  });

  fastify.delete('/commissions/:id', { preHandler: fastify.authorize([ROLE.admin]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    await db('commissions').where({ id }).del();
    reply.send({ id });
  });
}

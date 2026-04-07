import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { ROLE } from '../utils/roles';

const customerSchema = z.object({
  tel: z.string().min(3),
  name: z.string().min(1),
  comments: z.string().optional(),
  ref: z.string().optional(),
  group_flag: z.number().int().min(0).max(1).default(0)
});

const customerUpdateSchema = customerSchema.partial();

export async function customerRoutes(fastify: FastifyInstance) {
  fastify.get('/customers', { preHandler: fastify.authenticate }, async (request) => {
    const { search } = request.query as any;
    const query = db('customers').select('*');
    if (search) {
      query.where((qb) => {
        qb.where('tel', 'like', `%${search}%`).orWhere('name', 'like', `%${search}%`);
      });
    }
    return query.orderBy('created_at', 'desc');
  });

  fastify.get('/customers/:id', { preHandler: fastify.authenticate }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const customer = await db('customers').where({ id }).first();
    if (!customer) {
      return reply.code(404).send({ message: 'Customer not found' });
    }
    return customer;
  });

  fastify.post('/customers', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request, reply) => {
    const body = customerSchema.parse(request.body);
    const [id] = await db('customers').insert(body);
    reply.code(201).send({ id });
  });

  fastify.put('/customers/:id', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const body = customerUpdateSchema.parse(request.body);
    await db('customers').where({ id }).update(body);
    reply.send({ id });
  });
}

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { ROLE } from '../utils/roles';
import { isValidPhone, normalizePhone, normalizePhoneSearch } from '../utils/phone';

const phoneSchema = z.string()
  .transform((value) => normalizePhone(value))
  .refine((value) => isValidPhone(value), { message: 'Invalid phone number' });

const customerSchema = z.object({
  tel: phoneSchema,
  name: z.string().min(1),
  comments: z.string().optional(),
  ref: z.string().optional(),
  group_flag: z.number().int().min(0).max(1).default(0)
});

const customerUpdateSchema = customerSchema.partial();

export async function customerRoutes(fastify: FastifyInstance) {
  fastify.get('/customers', { preHandler: fastify.authenticate }, async (request) => {
    const { search } = request.query as any;
    const searchTerm = String(search || '').trim();
    const phoneSearch = normalizePhoneSearch(searchTerm);
    const query = db('customers').select('*');
    if (searchTerm) {
      query.where((qb) => {
        qb.where('name', 'like', `%${searchTerm}%`);
        if (phoneSearch) {
          qb.orWhere('tel', 'like', `%${phoneSearch}%`);
        }
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

  fastify.delete('/customers/:id', { preHandler: fastify.authorize([ROLE.admin]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const customer = await db('customers').where({ id }).first('id');
    if (!customer) {
      return reply.code(404).send({ message: 'Customer not found' });
    }

    await db.transaction(async (trx) => {
      await trx('bookings').where({ client_id: id }).del();
      await trx('customers').where({ id }).del();
    });

    return { id };
  });
}

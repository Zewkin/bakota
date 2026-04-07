import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { ROLE } from '../utils/roles';
import { config } from '../config';

const customerSchema = z.object({
  tel: z.string().min(3),
  name: z.string().min(1),
  comments: z.string().optional(),
  ref: z.string().optional(),
  group_flag: z.number().int().min(0).max(1).default(0)
});

const ALLOWED_DISCOUNTS = [0, 5, 10, 20, 50, 100] as const;

const bookingSchema = z.object({
  service_id: z.number().int(),
  avans: z.number().nonnegative().default(0),
  discount: z.number().int().refine((v) => ALLOWED_DISCOUNTS.includes(v as any), { message: 'Discount must be one of: 0, 5, 10, 20, 50, 100' }).default(0),
  date_start: z.string().min(1),
  start_time: z.string().min(1),
  product_id: z.number().int(),
  pax: z.number().int().positive().default(1),
  comments: z.string().optional(),
  canal: z.number().int().min(1).max(5).optional()
});

const bookingUpdateSchema = bookingSchema.partial();

const closeSchema = z.object({
  soldprice: z.number().nonnegative().optional(),
  soldprice_type: z.number().int().min(0).max(1),
  instructor: z.string().min(1),
  discount: z.number().int().refine((v) => ALLOWED_DISCOUNTS.includes(v as any), { message: 'Discount must be one of: 0, 5, 10, 20, 50, 100' }).optional()
});

const statusSchema = z.object({
  status: z.number().int().min(1).max(3)
});

const FINANCIAL_FIELDS = ['avans', 'discount', 'soldprice', 'soldprice_type', 'product_price'] as const;

const stripFinancialFields = (booking: Record<string, any>) => {
  const clean = { ...booking };
  for (const field of FINANCIAL_FIELDS) {
    delete clean[field];
  }
  return clean;
};

const getAccessibleServiceIds = async (userId: number, userType: number) => {
  if (userType === ROLE.admin) return null;
  return db('user_services').where({ user_id: userId }).pluck('service_id');
};

export async function bookingRoutes(fastify: FastifyInstance) {
  fastify.get('/bookings', { preHandler: fastify.authenticate }, async (request) => {
    const { from, to, manager_id, service_id, status, product_id, customer_tel, unread_only } = request.query as any;
    const userId = request.user.id;
    const userType = request.user.type;

    const query = db('bookings')
      .select(
        'bookings.*',
        'customers.tel as customer_tel',
        'customers.name as customer_name',
        'products.name as product_name',
        'services.name as service_name'
      )
      .join('customers', 'customers.id', 'bookings.client_id')
      .join('products', 'products.id', 'bookings.product_id')
      .join('services', 'services.id', 'bookings.service_id');

    if (from) query.where('bookings.date_start', '>=', from);
    if (to) query.where('bookings.date_start', '<=', to);
    if (manager_id) query.where('bookings.manager_id', Number(manager_id));
    if (service_id) query.where('bookings.service_id', Number(service_id));
    if (status) query.where('bookings.status', Number(status));
    if (product_id) query.where('bookings.product_id', Number(product_id));
    if (customer_tel) query.where('customers.tel', 'like', `%${customer_tel}%`);

    const allowedServices = await getAccessibleServiceIds(userId, userType);
    if (allowedServices) {
      query.whereIn('bookings.service_id', allowedServices as number[]);
    }

    if (unread_only === '1') {
      query.whereNotExists(function () {
        this.select('*')
          .from('booking_reads')
          .whereRaw('booking_reads.booking_id = bookings.id')
          .andWhere('booking_reads.user_id', userId);
      });
    }

    const rows = await query.orderBy('bookings.date_start', 'desc');

    const readBookingIds = await db('booking_reads')
      .where({ user_id: userId })
      .pluck('booking_id');
    const readSet = new Set(readBookingIds);

    const withRead = rows.map((row: any) => ({
      ...row,
      is_read: readSet.has(row.id),
    }));

    if (userType === ROLE.instructor) {
      return withRead.map(stripFinancialFields);
    }
    return withRead;
  });

  fastify.get('/bookings/:id', { preHandler: fastify.authenticate }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const userId = request.user.id;
    const userType = request.user.type;
    const booking = await db('bookings')
      .select(
        'bookings.*',
        'customers.tel as customer_tel',
        'customers.name as customer_name',
        'products.name as product_name',
        'services.name as service_name'
      )
      .join('customers', 'customers.id', 'bookings.client_id')
      .join('products', 'products.id', 'bookings.product_id')
      .join('services', 'services.id', 'bookings.service_id')
      .where('bookings.id', id)
      .first();

    if (!booking) {
      return reply.code(404).send({ message: 'Booking not found' });
    }

    const allowedServices = await getAccessibleServiceIds(userId, userType);
    if (allowedServices && !(allowedServices as number[]).includes(booking.service_id)) {
      return reply.code(403).send({ message: 'No access to this booking' });
    }

    if (userType === ROLE.instructor) {
      return stripFinancialFields(booking);
    }
    return booking;
  });

  fastify.post('/bookings', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request, reply) => {
    const body = z.object({
      customer: customerSchema,
      booking: bookingSchema
    }).parse(request.body);

    const userId = request.user.id;
    const userType = request.user.type;

    const allowedServices = await getAccessibleServiceIds(userId, userType);
    if (allowedServices && !(allowedServices as number[]).includes(body.booking.service_id)) {
      return reply.code(403).send({ message: 'No access to this service' });
    }

    const result = await db.transaction(async (trx) => {
      let customer = await trx('customers').where({ tel: body.customer.tel }).first();
      if (!customer) {
        const [customerId] = await trx('customers').insert({
          tel: body.customer.tel,
          name: body.customer.name,
          comments: body.customer.comments || null,
          ref: body.customer.ref || null,
          group_flag: body.customer.group_flag
        });
        customer = { id: customerId };
      }

      const [bookingId] = await trx('bookings').insert({
        client_id: customer.id,
        service_id: body.booking.service_id,
        avans: body.booking.avans,
        discount: body.booking.discount,
        date_start: body.booking.date_start,
        start_time: body.booking.start_time,
        product_id: body.booking.product_id,
        pax: body.booking.pax,
        comments: body.booking.comments || null,
        manager_id: userId,
        status: 1,
        canal: body.booking.canal || null
      });

      await trx('booking_reads').insert({ booking_id: bookingId, user_id: userId });
      return bookingId;
    });

    reply.code(201).send({ id: result });
  });

  fastify.put('/bookings/:id', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const body = bookingUpdateSchema.parse(request.body);

    const booking = await db('bookings').where({ id }).first();
    if (!booking) {
      return reply.code(404).send({ message: 'Booking not found' });
    }

    const allowedServices = await getAccessibleServiceIds(request.user.id, request.user.type);
    if (allowedServices && !(allowedServices as number[]).includes(booking.service_id)) {
      return reply.code(403).send({ message: 'No access to this booking' });
    }

    if (booking.status === 3 && request.user.type !== ROLE.admin) {
      return reply.code(403).send({ message: 'Booking is closed' });
    }

    await db('bookings').where({ id }).update(body);
    reply.send({ id });
  });

  fastify.patch('/bookings/:id/status', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const body = statusSchema.parse(request.body);
    const booking = await db('bookings').where({ id }).first();
    if (!booking) {
      return reply.code(404).send({ message: 'Booking not found' });
    }
    const allowedServices = await getAccessibleServiceIds(request.user.id, request.user.type);
    if (allowedServices && !(allowedServices as number[]).includes(booking.service_id)) {
      return reply.code(403).send({ message: 'No access to this booking' });
    }
    await db('bookings').where({ id }).update({ status: body.status });
    return { id };
  });

  fastify.patch('/bookings/:id/close', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const body = closeSchema.parse(request.body);
    const booking = await db('bookings').where({ id }).first();
    if (!booking) {
      return reply.code(404).send({ message: 'Booking not found' });
    }

    const allowedServices = await getAccessibleServiceIds(request.user.id, request.user.type);
    if (allowedServices && !(allowedServices as number[]).includes(booking.service_id)) {
      return reply.code(403).send({ message: 'No access to this booking' });
    }

    const product = await db('products').where({ id: booking.product_id }).first();
    const discount = body.discount ?? booking.discount;
    const basePrice = Number(product?.price ?? 0);
    const computedSold = basePrice * (1 - discount / 100);

    await db('bookings').where({ id }).update({
      status: 3,
      closed_by: request.user.id,
      soldprice: body.soldprice ?? computedSold,
      soldprice_type: body.soldprice_type,
      instructor: body.instructor,
      discount
    });

    reply.send({ id });
  });

  fastify.post('/bookings/:id/read', { preHandler: fastify.authenticate }, async (request) => {
    const id = Number((request.params as any).id);
    const userId = request.user.id;
    const exists = await db('booking_reads').where({ booking_id: id, user_id: userId }).first();
    if (!exists) {
      await db('booking_reads').insert({ booking_id: id, user_id: userId });
    }
    return { id };
  });

  fastify.get('/bookings/:id/message', { preHandler: fastify.authenticate }, async (request, reply) => {
    const id = Number((request.params as any).id);
    const booking = await db('bookings')
      .select('bookings.id', 'customers.name as customer_name')
      .join('customers', 'customers.id', 'bookings.client_id')
      .where('bookings.id', id)
      .first();

    if (!booking) {
      return reply.code(404).send({ message: 'Booking not found' });
    }

    const url = `${config.publicBookingBaseUrl}/${booking.id}`;
    const text = `${booking.customer_name},\nДеталі вашого бронювання:\n${url}.\nДякуємо за замовлення`;
    return { message: text };
  });
}

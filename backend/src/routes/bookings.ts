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

const ALLOWED_DISCOUNTS = [0, 5, 10, 20, 35, 50, 100] as const;
const BOOKING_STATUS_CANCELED = 2;
const SLOT_MINUTES = 30;

const bookingSchema = z.object({
  service_id: z.number().int(),
  avans: z.number().nonnegative().default(0),
  discount: z.number().int().refine((v) => ALLOWED_DISCOUNTS.includes(v as any), { message: 'Discount must be one of: 0, 5, 10, 20, 35, 50, 100' }).default(0),
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
  discount: z.number().int().refine((v) => ALLOWED_DISCOUNTS.includes(v as any), { message: 'Discount must be one of: 0, 5, 10, 20, 35, 50, 100' }).optional()
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

const timeToMinutes = (time: string) => {
  const [hours = '0', minutes = '0'] = time.slice(0, 5).split(':');
  return Number(hours) * 60 + Number(minutes);
};

const timeToSlotIndex = (time: string) => Math.round(timeToMinutes(time) / SLOT_MINUTES);

const getDurationSlots = (hours?: number | string | null) => Math.max(1, Math.ceil(Number(hours || 1) * 2));

const extractTime = (value: unknown) => {
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }

  const asString = String(value ?? '');
  const match = asString.match(/(\d{2}:\d{2})/);
  return match?.[1] || '00:00';
};

const rangesOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;

interface BookingValidationPayload {
  service_id: number;
  product_id: number;
  date_start: string;
  start_time: string;
  pax: number;
  status?: number;
}

const validateBookingRequest = async (
  booking: BookingValidationPayload,
  options: { excludeBookingId?: number; enforceAvailability?: boolean } = {}
) => {
  const service = await db('services').where({ id: booking.service_id }).first();
  if (!service) {
    return { statusCode: 404, message: 'Service not found' };
  }

  const product = await db('products').where({ id: booking.product_id }).first();
  if (!product) {
    return { statusCode: 404, message: 'Product not found' };
  }

  if (Number(product.service_id) !== Number(booking.service_id)) {
    return { statusCode: 400, message: 'Product does not belong to this service' };
  }

  const capacity = Math.max(Number(service.maxpax ?? 0), 1);
  const pax = Number(booking.pax || 1);
  if (pax > capacity) {
    return { statusCode: 400, message: `Максимальна кількість для цього сервісу: ${capacity}` };
  }

  const startSlot = timeToSlotIndex(booking.start_time);
  const durationSlots = getDurationSlots(product.hours);
  const endSlot = startSlot + durationSlots;
  const serviceStartSlot = timeToSlotIndex(service.start_time);
  const serviceEndSlot = timeToSlotIndex(service.end_time);

  if (startSlot < serviceStartSlot || endSlot > serviceEndSlot) {
    return { statusCode: 400, message: 'Бронювання виходить за межі робочого часу сервісу' };
  }

  const shouldCheckAvailability = options.enforceAvailability ?? true;
  if (!shouldCheckAvailability || booking.status === BOOKING_STATUS_CANCELED) {
    return null;
  }

  const blockedTimes = await db('blocked_time')
    .select('start', 'blocked_hours')
    .where({ service_id: booking.service_id })
    .whereRaw('DATE(start) = ?', [booking.date_start]);

  for (const blocked of blockedTimes as Array<{ start: string | Date; blocked_hours: number | string }>) {
    const blockedStartSlot = timeToSlotIndex(extractTime(blocked.start));
    const blockedEndSlot = blockedStartSlot + getDurationSlots(blocked.blocked_hours);
    if (rangesOverlap(startSlot, endSlot, blockedStartSlot, blockedEndSlot)) {
      return { statusCode: 409, message: 'Цей час заблоковано' };
    }
  }

  const existingBookingsQuery = db('bookings')
    .select('bookings.id', 'bookings.start_time', 'bookings.pax', 'products.hours as product_hours')
    .join('products', 'products.id', 'bookings.product_id')
    .where('bookings.service_id', booking.service_id)
    .andWhere('bookings.date_start', booking.date_start)
    .whereNot('bookings.status', BOOKING_STATUS_CANCELED);

  if (options.excludeBookingId !== undefined) {
    existingBookingsQuery.whereNot('bookings.id', options.excludeBookingId);
  }

  const existingBookings = await existingBookingsQuery;
  const slotLoad = new Map<number, number>();

  for (const existing of existingBookings as Array<{ start_time: string; pax: number; product_hours: number | string }>) {
    const existingStartSlot = timeToSlotIndex(existing.start_time);
    const existingEndSlot = existingStartSlot + getDurationSlots(existing.product_hours);

    if (!rangesOverlap(startSlot, endSlot, existingStartSlot, existingEndSlot)) {
      continue;
    }

    for (let slot = existingStartSlot; slot < existingEndSlot; slot++) {
      slotLoad.set(slot, (slotLoad.get(slot) || 0) + Number(existing.pax || 1));
    }
  }

  for (let slot = startSlot; slot < endSlot; slot++) {
    const occupied = slotLoad.get(slot) || 0;
    const available = Math.max(capacity - occupied, 0);
    if (occupied + pax > capacity) {
      const message = available > 0
        ? `На цей час доступно лише ${available} місць`
        : 'На цей час вільних місць немає';
      return { statusCode: 409, message };
    }
  }

  return null;
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

    const validationError = await validateBookingRequest(body.booking);
    if (validationError) {
      return reply.code(validationError.statusCode).send({ message: validationError.message });
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

    const mergedBooking = { ...booking, ...body };
    const allowedServices = await getAccessibleServiceIds(request.user.id, request.user.type);
    if (allowedServices && !(allowedServices as number[]).includes(mergedBooking.service_id)) {
      return reply.code(403).send({ message: 'No access to this booking' });
    }

    const validationError = await validateBookingRequest(mergedBooking, {
      excludeBookingId: id,
      enforceAvailability: Number(mergedBooking.status) !== BOOKING_STATUS_CANCELED,
    });
    if (validationError) {
      return reply.code(validationError.statusCode).send({ message: validationError.message });
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

    if (body.status !== BOOKING_STATUS_CANCELED) {
      const validationError = await validateBookingRequest({ ...booking, status: body.status }, {
        excludeBookingId: id,
        enforceAvailability: true,
      });
      if (validationError) {
        return reply.code(validationError.statusCode).send({ message: validationError.message });
      }
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
    const computedSold = basePrice * Number(booking.pax || 1) * (1 - discount / 100);

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
    const text = `${booking.customer_name},\nОсь деталі вашого бронювання:\n${url}\nДякуємо за замовлення і до зустрічі на Бакоті!`;
    return { message: text };
  });
}

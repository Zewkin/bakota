import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { ROLE } from '../utils/roles';

const shiftYear = (dateStr: string, delta: number) => {
  const date = new Date(dateStr);
  date.setFullYear(date.getFullYear() + delta);
  return date.toISOString().slice(0, 10);
};

const managerQuery = (from?: string, to?: string, productId?: number, status?: number) => {
  const query = db('bookings')
    .select('bookings.manager_id')
    .count<{ manager_id: number; total_count: number }[]>({ total_count: '*' })
    .sum({
      total_amount: db.raw('COALESCE(bookings.soldprice, products.price * bookings.pax * (1 - bookings.discount/100))')
    })
    .sum({
      total_commission: db.raw('COALESCE(bookings.soldprice, products.price * bookings.pax * (1 - bookings.discount/100)) * (COALESCE(commissions.commission, 0) / 100)')
    })
    .join('products', 'products.id', 'bookings.product_id')
    .leftJoin('commissions', function () {
      this.on('commissions.user_id', '=', 'bookings.manager_id').andOn('commissions.product_id', '=', 'bookings.product_id');
    })
    .groupBy('bookings.manager_id');

  if (from) query.where('bookings.date_start', '>=', from);
  if (to) query.where('bookings.date_start', '<=', to);
  if (productId) query.where('bookings.product_id', productId);
  if (status) query.where('bookings.status', status);

  return query;
};

const serviceQuery = (from?: string, to?: string, status?: number, productId?: number) => {
  const query = db('bookings')
    .select('bookings.service_id')
    .count({ total_count: '*' })
    .sum({ total_pax: 'bookings.pax' })
    .sum({
      total_amount: db.raw('COALESCE(bookings.soldprice, products.price * bookings.pax * (1 - bookings.discount/100))')
    })
    .sum({
      total_rent: db.raw('CASE WHEN products.type = 1 THEN 1 ELSE 0 END')
    })
    .sum({
      total_tour: db.raw('CASE WHEN products.type = 2 THEN 1 ELSE 0 END')
    })
    .join('products', 'products.id', 'bookings.product_id')
    .groupBy('bookings.service_id');

  if (from) query.where('bookings.date_start', '>=', from);
  if (to) query.where('bookings.date_start', '<=', to);
  if (status) query.where('bookings.status', status);
  if (productId) query.where('bookings.product_id', productId);

  return query;
};

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/analytics/managers', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request) => {
    const { from, to, product_id, status, compare } = request.query as any;

    if (compare === '1' && from && to) {
      const prevFrom = shiftYear(from, -1);
      const prevTo = shiftYear(to, -1);
      const [current, previous] = await Promise.all([
        managerQuery(from, to, product_id ? Number(product_id) : undefined, status ? Number(status) : undefined),
        managerQuery(prevFrom, prevTo, product_id ? Number(product_id) : undefined, status ? Number(status) : undefined)
      ]);
      return { current, previous };
    }

    return managerQuery(from, to, product_id ? Number(product_id) : undefined, status ? Number(status) : undefined);
  });

  fastify.get('/analytics/services', { preHandler: fastify.authorize([ROLE.admin, ROLE.manager]) }, async (request) => {
    const { from, to, status, product_id, compare } = request.query as any;

    if (compare === '1' && from && to) {
      const prevFrom = shiftYear(from, -1);
      const prevTo = shiftYear(to, -1);
      const [current, previous] = await Promise.all([
        serviceQuery(from, to, status ? Number(status) : undefined, product_id ? Number(product_id) : undefined),
        serviceQuery(prevFrom, prevTo, status ? Number(status) : undefined, product_id ? Number(product_id) : undefined)
      ]);
      return { current, previous };
    }

    return serviceQuery(from, to, status ? Number(status) : undefined, product_id ? Number(product_id) : undefined);
  });
}

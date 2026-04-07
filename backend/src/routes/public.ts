import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { loadTemplate, renderTemplate } from '../utils/template';

export async function publicRoutes(fastify: FastifyInstance) {
  fastify.get('/booking/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const booking = await db('bookings')
      .select(
        'bookings.id',
        'bookings.pax',
        'bookings.soldprice',
        'bookings.discount',
        'bookings.date_start',
        'bookings.start_time',
        'customers.name as customer_name',
        'products.name as product_name',
        'products.price as product_price',
        'services.id as service_id',
        'services.template_html as template_html'
      )
      .join('customers', 'customers.id', 'bookings.client_id')
      .join('products', 'products.id', 'bookings.product_id')
      .join('services', 'services.id', 'bookings.service_id')
      .where('bookings.id', id)
      .first();

    if (!booking) {
      return reply.code(404).type('text/plain').send('Booking not found');
    }

    const basePrice = Number(booking.product_price ?? 0);
    const discount = Number(booking.discount ?? 0);
    const sum = Number(booking.soldprice ?? basePrice * Number(booking.pax || 1) * (1 - discount / 100));

    const template = loadTemplate(booking.service_id, booking.template_html);
    const html = renderTemplate(template, {
      Name: booking.customer_name,
      Product: booking.product_name,
      Sum: sum.toFixed(2),
      Date: booking.date_start,
      Time: booking.start_time
    });

    reply.type('text/html').send(html);
  });
}

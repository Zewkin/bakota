import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config';
import authPlugin from './plugins/auth';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { serviceRoutes } from './routes/services';
import { productRoutes } from './routes/products';
import { customerRoutes } from './routes/customers';
import { bookingRoutes } from './routes/bookings';
import { blockedTimeRoutes } from './routes/blocked-time';
import { analyticsRoutes } from './routes/analytics';
import { publicRoutes } from './routes/public';
import { commissionRoutes } from './routes/commissions';

const app = fastify({ logger: true });

app.register(cors, { origin: true });
app.register(helmet);
app.register(authPlugin);

app.register(authRoutes, { prefix: '/api' });
app.register(userRoutes, { prefix: '/api' });
app.register(serviceRoutes, { prefix: '/api' });
app.register(productRoutes, { prefix: '/api' });
app.register(customerRoutes, { prefix: '/api' });
app.register(bookingRoutes, { prefix: '/api' });
app.register(blockedTimeRoutes, { prefix: '/api' });
app.register(commissionRoutes, { prefix: '/api' });
app.register(analyticsRoutes, { prefix: '/api' });
app.register(publicRoutes);

app.get('/health', async () => ({ status: 'ok' }));

app.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

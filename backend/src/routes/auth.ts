import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { hashPassword, verifyPassword } from '../utils/password';
import { ROLE } from '../utils/roles';

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1)
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/bootstrap', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const existingCount = await db('users').count<{ count: number }[]>({ count: '*' }).first();
    if (existingCount && Number(existingCount.count) > 0) {
      return reply.code(403).send({ message: 'Bootstrap disabled' });
    }

    const passwordHash = await hashPassword(body.password);
    const [id] = await db('users').insert({
      login: body.login,
      password_hash: passwordHash,
      type: ROLE.admin,
      active: 1
    });

    return reply.code(201).send({ id });
  });

  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await db('users')
      .select('id', 'login', 'password_hash', 'type', 'active')
      .where({ login: body.login })
      .first();

    if (!user || user.active !== 1) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const ok = await verifyPassword(body.password, user.password_hash);
    if (!ok) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({ id: user.id, type: user.type });
    reply.send({ token, user: { id: user.id, login: user.login, type: user.type } });
  });
}

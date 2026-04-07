import '@fastify/jwt';
import { Role } from '../utils/roles';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; type: Role };
    user: { id: number; type: Role };
  }
}

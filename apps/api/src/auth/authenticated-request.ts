import { FastifyRequest } from 'fastify';
import { Role } from './permissions';

export interface AuthenticatedContext {
  clerkUserId: string;
  clerkOrgId: string;
  email?: string;
  tenantId: string;
  membershipId: string;
  role: Role;
}

export type AuthenticatedRequest = FastifyRequest & {
  auth?: AuthenticatedContext;
  correlationId?: string;
};

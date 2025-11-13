import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      name: string;
      role: UserRole;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};

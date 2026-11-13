// Session auth guard.
//
// Most routes require a logged-in session. The guard only checks that *a*
// session exists — it does NOT check identity against the :id in the URL. That
// missing ownership check is the other half of the lab (write IDOR): any
// authenticated user may target any user's :id.
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export interface SessionData {
  userId?: number;
  username?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { session: SessionData }>();
    if (!req.session?.userId) {
      throw new UnauthorizedException('Not authenticated. POST /api/login first.');
    }
    return true;
  }
}

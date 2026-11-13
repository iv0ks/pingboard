// Authentication controller: session login / logout.
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { verifyPassword } from '../auth.js';
import type { SessionData } from '../users/auth.guard.js';

@Controller('api')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  async login(
    @Req() req: Request & { session: SessionData },
    @Body() body: { username?: unknown; password?: unknown },
  ) {
    const { username, password } = body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new BadRequestException('username and password are required');
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    return {
      ok: true,
      user: { id: user.id, username: user.username, displayName: user.displayName },
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request & { session: { destroy: (cb: () => void) => void } }) {
    return new Promise((resolve) => {
      req.session.destroy(() => resolve({ ok: true }));
    });
  }
}

// Users controller.
//
// The intentional vulnerability lives in `PATCH /api/users/:id`:
//   1. write IDOR — it updates the user identified by the URL `:id`, never
//      checking that it matches the logged-in session user; and
//   2. mass assignment — it forwards the whole validated DTO (which includes
//      `role`, `verified`, `secretNote`) to the UPDATE.
//
// Together: any authenticated user can edit ANY other user's profile and set
// fields they must not control. Reading the response (or a follow-up GET)
// reveals the victim's secretNote — and the flag.
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, type SessionData } from './auth.guard.js';
import { UpdateUserDto } from './dto.js';
import { UsersService } from './users.service.js';

@Controller('api/users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Who am I? Returns the session user's own profile.
  @Get('me')
  async me(@Req() req: Request & { session: SessionData }) {
    const user = await this.users.findById(req.session.userId!);
    if (!user) throw new NotFoundException('user not found');
    return { user: this.users.publicProfile(user) };
  }

  // ⚠️ VULNERABLE: fetches by the URL :id with no ownership check.
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('user not found');
    return { user: this.users.publicProfile(user) };
  }

  // ⚠️ VULNERABLE: write IDOR + mass assignment (see file header).
  //
  // The fix (see SOLUTION.md) is two changes:
  //   - ignore :id and update req.session.userId instead (ownership), and
  //   - whitelist editable fields (displayName/bio/location) only.
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() patch: UpdateUserDto) {
    const updated = await this.users.applyUpdate(id, patch);
    return { user: this.users.publicProfile(updated) };
  }
}

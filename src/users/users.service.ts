// Users service — the data layer for the lab.
import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, type User } from '../db/schema.js';
import type { UpdateUserDto } from './dto.js';

// Shape returned for a user's own profile (includes the private secretNote).
function toSelfProfile(u: User) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    location: u.location,
    role: u.role,
    verified: u.verified,
    secretNote: u.secretNote,
  };
}

@Injectable()
export class UsersService {
  async findById(id: number): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }

  // ⚠️ THE VULNERABILITY (mass assignment half).
  //
  // The DTO is spread straight into the UPDATE set. Any field present in the
  // request body — including `role`, `verified`, `secretNote` — is written.
  // A correct implementation would pick ONLY the editable fields:
  //   const safe = { displayName, bio, location };
  // and would scope the update to the authenticated user's own id.
  async applyUpdate(id: number, patch: UpdateUserDto): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...patch })
      .where(eq(users.id, id))
      .returning();
    if (!updated) {
      throw new NotFoundException('user not found');
    }
    return updated;
  }

  publicProfile(u: User) {
    return toSelfProfile(u);
  }
}

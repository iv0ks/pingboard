// Database schema (Drizzle ORM).
//
// pingboard is a small social-profile service. The lab lives on the `users`
// table: it mixes fields the owner may legitimately edit (displayName, bio,
// location) with fields the client must NOT control (role, verified) and a
// private field that only the owner should ever read (secretNote). The
// victim's secretNote carries the flag.
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),

  // Public-ish profile fields. The owner may edit these.
  displayName: text('display_name').notNull(),
  bio: text('bio').notNull().default(''),
  location: text('location').notNull().default(''),

  // Privilege / trust fields. These must NEVER be settable from a profile
  // update payload — only the system assigns them. Mass assignment is the flaw.
  role: text('role').notNull().default('member'),
  verified: boolean('verified').notNull().default(false),

  // Private field: only the account owner should ever see this. The victim's
  // secretNote holds the flag.
  secretNote: text('secret_note').notNull().default(''),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

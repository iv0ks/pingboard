// Seed script — idempotent.
//
// Three identities make the lab work:
//   - alice  (id 1): you, a low-privilege member. Credentials alice/password123.
//   - bob    (id 2): the victim. His secretNote carries the FLAG.
//   - carol  (id 3): bystander, keeps the dataset realistic.
//
// The flag lives in bob's `secretNote`. A legitimate alice can only read/edit
// her OWN profile; reaching bob's note (or flipping her own role to admin) is
// only possible through the intentional write-IDOR / mass-assignment flaw.
import { eq } from 'drizzle-orm';
import { db, sql } from './client.js';
import { users } from './schema.js';
import { hashPassword } from '../auth.js';
import { config } from '../config.js';

type SeedUser = {
  id: number;
  username: string;
  password: string;
  displayName: string;
  bio: string;
  location: string;
  role: string;
  verified: boolean;
  secretNote: string;
};

const seedUsers: SeedUser[] = [
  {
    id: 1,
    username: 'alice',
    password: 'password123',
    displayName: 'Alice Martins',
    bio: 'Product designer. Coffee first.',
    location: 'Lisbon',
    role: 'member',
    verified: false,
    secretNote: 'Remember to renew the domain.',
  },
  {
    id: 2,
    username: 'bob',
    password: 'correct-horse-battery-staple',
    displayName: 'Bob Keller',
    bio: 'Infra lead. I keep the lights on.',
    location: 'Berlin',
    role: 'admin',
    verified: true,
    // The flag is injected from the environment at seed time.
    secretNote: `Recovery codes stored offline. ${config.flag}`,
  },
  {
    id: 3,
    username: 'carol',
    password: 'hunter2hunter2',
    displayName: 'Carol Nwosu',
    bio: 'Community manager.',
    location: 'Lagos',
    role: 'member',
    verified: true,
    secretNote: 'Nothing to see here.',
  },
];

async function main(): Promise<void> {
  console.log('[seed] seeding users …');
  for (const u of seedUsers) {
    const row = {
      id: u.id,
      username: u.username,
      passwordHash: hashPassword(u.password),
      displayName: u.displayName,
      bio: u.bio,
      location: u.location,
      role: u.role,
      verified: u.verified,
      secretNote: u.secretNote,
    };
    await db
      .insert(users)
      .values(row)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: row.username,
          passwordHash: row.passwordHash,
          displayName: row.displayName,
          bio: row.bio,
          location: row.location,
          role: row.role,
          verified: row.verified,
          secretNote: row.secretNote,
        },
      });
  }

  // Keep the serial sequence ahead of the seeded ids.
  await sql`SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users))`;

  const [bob] = await db.select().from(users).where(eq(users.username, 'bob')).limit(1);
  console.log(
    `[seed] done. users: alice, bob, carol. flag seeded on bob's secretNote (id ${bob?.id}).`,
  );
  await sql.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});

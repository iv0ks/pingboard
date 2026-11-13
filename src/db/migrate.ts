// Apply pending Drizzle migrations, then exit. Run by the container entrypoint
// before the server starts, and available locally via `pnpm db:migrate`.
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './client.js';

async function main(): Promise<void> {
  console.log('[migrate] applying migrations from ./drizzle …');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('[migrate] done.');
  await sql.end();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});

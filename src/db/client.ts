// Database client: a single postgres.js pool wrapped by Drizzle.
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema.js';

// postgres.js connects lazily; importing this module opens no socket until the
// first query. `max: 5` keeps the pool small — this is a lab.
const queryClient = postgres(config.databaseUrl, { max: 5 });

export const db = drizzle(queryClient, { schema });

// Raw client so migrate/seed scripts can close it and exit cleanly.
export const sql = queryClient;

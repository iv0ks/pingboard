// Integration smoke tests that do not require a live database.
//
// The full write-IDOR / mass-assignment exploit is verified end-to-end against
// the Docker stack (see SOLUTION.md). These tests pin the guarantees that do
// not touch Postgres:
//   1. the health endpoint responds, and
//   2. the user endpoints refuse unauthenticated callers (the auth guard runs
//      before any DB access, so no connection is opened).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/main.js';

let app: INestApplication;

beforeAll(async () => {
  app = await createApp();
  await app.init();
});

afterAll(async () => {
  await app?.close();
});

describe('pingboard http surface', () => {
  it('serves the health check', async () => {
    const res = await request(app.getHttpServer()).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('requires a session to read a user (the IDOR GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/users/2');
    expect(res.status).toBe(401);
  });

  it('requires a session to patch a user (the write-IDOR endpoint)', async () => {
    const res = await request(app.getHttpServer()).patch('/api/users/2').send({ role: 'admin' });
    expect(res.status).toBe(401);
  });

  it('requires a session for /api/users/me', async () => {
    const res = await request(app.getHttpServer()).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

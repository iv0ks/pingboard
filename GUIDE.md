# pingboard: Learning Guide

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Node](https://img.shields.io/badge/Node-NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**pingboard is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw so you can practice finding and exploiting it in a safe and controlled environment.

<br>

> [!TIP]
> A guided, **non-spoiler** path to solving this lab. It teaches the *method*, not the answer — the exact winning request and the flag stay in [SOLUTION.md](SOLUTION.md).

<br>

## 🧬 What broken access control is

Here is the whole idea in one sentence:

> **Broken access control happens when an app checks _who you are_ but forgets
> to check _whether you're allowed to touch this particular thing_.**

Logging in answers "who are you?" — that's **authentication**. Deciding whether
*this* user may modify *this* profile is a separate question — that's
**authorization**. This lab is an **IDOR** (Insecure Direct Object Reference),
but a step up from reading: here the app lets you *write*. It takes an object id
straight from the request and updates that object, never asking whether it
belongs to the caller.

Think of it like a building where the front desk checks your ID (authentication)
and then hands you a master key that edits the nameplate on *any* door — and, if
you ask nicely, also flips the "VIP" switch on your own. Nobody meant to give you
either power; the system simply never checked.

> Want the deeper background — horizontal vs vertical escalation, how to test it
> methodically with two accounts, and the full workflow with **Burp Suite** and
> **OWASP ZAP**? Read the shared
> **[Broken Access Control field guide](https://github.com/iv0ks/appsec-labs/blob/main/docs/broken-access-control.md)**.
> This lab is a hands-on application of it.

<br>

## 🎓 What this level teaches

**Level 2 — a write IDOR with mass assignment.** pingboard moves from *reading*
someone else's object (Level 1, [ledgerly](https://github.com/iv0ks/ledgerly)) to
*modifying* it. There are two overlapping flaws in one endpoint:

1. **Write IDOR.** `PATCH /api/users/:id` updates the user named in the URL with
   no check that it is *you*. Change the id, edit someone else's account.
2. **Mass assignment.** The update accepts whatever fields you send and writes
   them all — including fields the profile form never exposes, like a role flag
   or a private note. The server trusts the shape of your payload.

- **Entry point:** `PATCH /api/users/:id`
- **The broken defence:** a session check only — being logged in is treated as enough.
- **What you can do legitimately:** edit your own display name, bio and location.
- **The target:** another user's private field, plus privilege fields you were never offered.

## 🪧 How to approach it

1. Sign in as `alice` through your proxy and open the profile page. Edit your bio
   and save. Capture that `PATCH` request — note the numeric id in the path and
   the small JSON body of profile fields.
2. That id is *your* id, straight in the URL. Ask the obvious question: what if
   you change it to a different number? Re-point the request at another id and
   send it.
3. Now look at the **body**. The form only ever sends display name, bio and
   location — but what else does the data model have? Profiles usually carry more
   than what the UI shows: a role, a verified flag, a private note. Try adding a
   field the form never sent and see whether the server keeps it.
4. Combine the two: target a *different* user's id **and** read back what comes
   out. Then target *your own* id and try to set a field that grants you
   something the form never offered.

## 🕵️‍♂️ Going further

Because the only check is "are you logged in?", this isn't one account — it's
every account, in both directions. An attacker can rewrite any profile in the
system, harvest private fields, and self-promote. Keep two identities handy (a
second seeded account) so you can prove that an action performed as A lands on
B's record — that contrast is the proof of a broken authorization check, and it
is exactly how you'd demonstrate impact in a real engagement.

## 🤔 Why it matters

Write-side broken access control is more dangerous than read-side: it doesn't
just leak data, it lets an attacker *change state* — hijack accounts, escalate
privileges, tamper with records. Mass assignment makes it worse by turning a
harmless-looking "edit your profile" request into a lever on fields the designers
assumed were off-limits. Both come from the same root: trusting the client to
tell the server *who* and *what* it may touch.

---

When you have captured the flag (or want to check the fix and the *why* behind
it), continue to **[SOLVE → SOLUTION.md](SOLUTION.md)**.

<br>

> **Legal / ethics.** This is an educational, deliberately vulnerable lab. Run it
> only locally, on owned, isolated infrastructure, and never use these techniques
> against systems without explicit written authorization.

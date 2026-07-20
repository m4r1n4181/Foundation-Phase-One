---
name: Zod v3 API notes
description: Zod v3 quirks specific to this codebase; what doesn't work vs what you might expect from v4 docs
---

## Rule

Always import from `"zod"`, never from `"zod/v4"` — the `/v4` subpath export does not resolve.

**Why:** The workspace uses zod@3.25.76. While zod v3.23+ added a v4 compat API, the `/v4` subpath requires package.json exports that this version doesn't expose, causing a TS2307 module-not-found error.

## How to apply

- `z.string().email()` — NOT `z.email()`
- `z.enum(["a", "b"] as const)` — the `as const` prevents implicit any on the tuple
- Zod error objects in `.safeParse()` failures: `error.errors` items have type `{ path: (string | number)[]; message: string }` — annotate explicitly if used in `.map()`

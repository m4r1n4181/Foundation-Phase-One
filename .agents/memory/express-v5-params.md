---
name: Express v5 params typing
description: Express v5 types req.params values as string | string[] — how to handle safely
---

## Rule

Always cast `req.params` when destructuring in route handlers:

```ts
const { id } = req.params as Record<string, string>;
```

**Why:** Express v5 changed the type of `ParamsDictionary` values from `string` to `string | string[]`. Passing a `string | string[]` into `eq()` (Drizzle) or `argon2.hash/verify()` causes TS2769/TS2345 errors. The cast is safe because Express route params defined with `:id` syntax always resolve to a single string at runtime.

**How to apply:** Apply to every route handler that reads from `req.params`. Pattern: `const { id } = req.params as Record<string, string>;`

---
"no-mess": minor
---

Add local schema code generation and clearer draft-sync messaging in the CLI.

- add `no-mess codegen` to generate app-ready TypeScript contracts from `schema.ts`
- document `--out` support and the generated field-path metadata output
- warn after `push` and `dev` that schema syncs create drafts until published in the dashboard

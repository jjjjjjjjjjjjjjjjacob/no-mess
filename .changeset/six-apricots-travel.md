---
"@no-mess/client": minor
"no-mess": patch
"@no-mess/mcp": patch
---

Align the released packages with the recursive template and fragment schema
model.

`@no-mess/client` now documents the schema builder around
`defineTemplate()`, `defineFragment()`, route-bound singleton templates, and
recursive object/array/fragment fields.

`no-mess` now scaffolds a recursive starter schema from `no-mess init`, so new
projects start with template/fragment examples instead of the older flat schema
shape.

`@no-mess/mcp` now validates that it is configured with a secret API key,
exposes a `get_collection` tool, and documents the richer schema metadata it
returns for templates and fragments.

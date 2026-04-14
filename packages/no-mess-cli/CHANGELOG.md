# no-mess

## 0.2.0

### Minor Changes

- [#36](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/pull/36) [`3dc33be`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/3dc33be3ce2501e986aba9939ee2d637f531d006) Thanks [@jjjjjjjjjjjjjjjjacob](https://github.com/jjjjjjjjjjjjjjjjacob)! - Add local schema code generation and clearer draft-sync messaging in the CLI.
  - add `no-mess codegen` to generate app-ready TypeScript contracts from `schema.ts`
  - document `--out` support and the generated field-path metadata output
  - warn after `push` and `dev` that schema syncs create drafts until published in the dashboard

### Patch Changes

- Updated dependencies [[`3dc33be`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/3dc33be3ce2501e986aba9939ee2d637f531d006)]:
  - @no-mess/client@0.6.0

## 0.1.3

### Patch Changes

- [#26](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/pull/26) [`3a26c7c`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/3a26c7c1b214753b14f5591868edc71407d7189e) Thanks [@jjjjjjjjjjjjjjjjacob](https://github.com/jjjjjjjjjjjjjjjjacob)! - Align the released packages with the recursive template and fragment schema
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

- Updated dependencies [[`3a26c7c`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/3a26c7c1b214753b14f5591868edc71407d7189e)]:
  - @no-mess/client@0.5.0

## 0.1.2

### Patch Changes

- Updated dependencies [[`bf7e392`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/bf7e392f45095a2bcfd5cff6ccc24f72e36b2b58)]:
  - @no-mess/client@0.4.0

## 0.1.1

### Patch Changes

- [#20](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/pull/20) [`299507e`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/299507e0a5b03ede81d7a3cfb67c7d39bdc87ea2) Thanks [@jjjjjjjjjjjjjjjjacob](https://github.com/jjjjjjjjjjjjjjjjacob)! - Enhance SDK client with error utils, logging module, improved live-edit/preview, and comprehensive test coverage. Improve CLI config handling with validation and tests. Update MCP README documentation.

- Updated dependencies [[`299507e`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/299507e0a5b03ede81d7a3cfb67c7d39bdc87ea2)]:
  - @no-mess/client@0.3.0

## 0.1.0

### Minor Changes

- [#5](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/pull/5) [`615f07d`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/615f07df6162accc4a253b4ae4947a0e34681eff) Thanks [@jjjjjjjjjjjjjjjjacob](https://github.com/jjjjjjjjjjjjjjjjacob)! - Add CLI package with `init`, `push`, `pull`, and `dev` commands for managing content type schemas from the terminal. Supports `.env` configuration, file watching, and schema validation.

### Patch Changes

- Updated dependencies [[`615f07d`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/615f07df6162accc4a253b4ae4947a0e34681eff)]:
  - @no-mess/client@0.2.0

## 0.1.0

### Minor Changes

- 615f07d: Add CLI package with `init`, `push`, `pull`, and `dev` commands for managing content type schemas from the terminal. Supports `.env` configuration, file watching, and schema validation.

### Patch Changes

- Updated dependencies [615f07d]
  - @no-mess/client@0.2.0

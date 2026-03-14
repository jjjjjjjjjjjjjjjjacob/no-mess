## @no-mess/client [0.1.1](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/compare/@no-mess/client@0.1.0...@no-mess/client@0.1.1) (2026-03-03)

## 0.5.1

### Patch Changes

- [#34](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/pull/34) [`25ad291`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/25ad29173115581525df708d1f5d5c3c6ede431b) Thanks [@jjjjjjjjjjjjjjjjacob](https://github.com/jjjjjjjjjjjjjjjjacob)! - Fix nested path updates so deep writes replace primitive values with the
  required object or array containers. Also initialize fragment-backed fields
  with empty object defaults when creating new values.

## 0.5.0

### Minor Changes

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

## 0.4.0

### Minor Changes

- [#24](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/pull/24) [`bf7e392`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/bf7e392f45095a2bcfd5cff6ccc24f72e36b2b58) Thanks [@jjjjjjjjjjjjjjjjacob](https://github.com/jjjjjjjjjjjjjjjjacob)! - Add route-aware preview and live edit support for real site routes. This
  releases `NoMessLiveRouteProvider`, `useNoMessEditableEntry`, `NoMessField`,
  `useNoMessField`, and `client.reportLiveEditRoute()`, and adds select-mode
  control for the live edit overlay.

## 0.3.0

### Minor Changes

- [#20](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/pull/20) [`299507e`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/299507e0a5b03ede81d7a3cfb67c7d39bdc87ea2) Thanks [@jjjjjjjjjjjjjjjjacob](https://github.com/jjjjjjjjjjjjjjjjacob)! - Enhance SDK client with error utils, logging module, improved live-edit/preview, and comprehensive test coverage. Improve CLI config handling with validation and tests. Update MCP README documentation.

## 0.2.0

### Minor Changes

- [#5](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/pull/5) [`615f07d`](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/615f07df6162accc4a253b4ae4947a0e34681eff) Thanks [@jjjjjjjjjjjjjjjjacob](https://github.com/jjjjjjjjjjjjjjjjacob)! - Add schema builder SDK (`@no-mess/client/schema`) with `defineSchema`, `defineContentType`, and `field.*` builders for defining content type schemas in code. Includes `parseSchemaSource` and `generateSchemaSource` utilities for round-tripping schema files.

### Bug Fixes

- ci build errors, removed built files from git ([da8f836](https://github.com/jjjjjjjjjjjjjjjjacob/no-mess/commit/da8f83695c03d9f97d1e7047d3f282be2ff9fa50))

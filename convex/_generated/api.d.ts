/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __tests___helpers_mockCtx from "../__tests__/helpers/mockCtx.js";
import type * as assets from "../assets.js";
import type * as contentEntries from "../contentEntries.js";
import type * as contentTypes from "../contentTypes.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_apiAuth from "../lib/apiAuth.js";
import type * as lib_apiResponse from "../lib/apiResponse.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_previewCrypto from "../lib/previewCrypto.js";
import type * as lib_schemaIntrospection from "../lib/schemaIntrospection.js";
import type * as lib_shopify from "../lib/shopify.js";
import type * as lib_utils from "../lib/utils.js";
import type * as lib_validators from "../lib/validators.js";
import type * as previewSessions from "../previewSessions.js";
import type * as shopify from "../shopify.js";
import type * as shopifySync from "../shopifySync.js";
import type * as siteAccess from "../siteAccess.js";
import type * as sites from "../sites.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__tests__/helpers/mockCtx": typeof __tests___helpers_mockCtx;
  assets: typeof assets;
  contentEntries: typeof contentEntries;
  contentTypes: typeof contentTypes;
  crons: typeof crons;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/apiAuth": typeof lib_apiAuth;
  "lib/apiResponse": typeof lib_apiResponse;
  "lib/auth": typeof lib_auth;
  "lib/previewCrypto": typeof lib_previewCrypto;
  "lib/schemaIntrospection": typeof lib_schemaIntrospection;
  "lib/shopify": typeof lib_shopify;
  "lib/utils": typeof lib_utils;
  "lib/validators": typeof lib_validators;
  previewSessions: typeof previewSessions;
  shopify: typeof shopify;
  shopifySync: typeof shopifySync;
  siteAccess: typeof siteAccess;
  sites: typeof sites;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

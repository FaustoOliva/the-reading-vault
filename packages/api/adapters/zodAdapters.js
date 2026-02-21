/**
 * Zod Schema Adapters for API HTTP Context
 *
 * Provides utilities to adapt common base schemas for HTTP/Express environment:
 * - Strict mode enforcement
 * - HTTP-specific validations
 *
 * Note: Coercion for query params must be handled explicitly in controllers
 * using z.coerce.number(), z.coerce.boolean(), etc. on individual fields
 */

/**
 * Adds strict mode to schema (rejects unknown fields)
 * Standard for all API request validation
 *
 * @param {z.ZodObject} schema - Base schema
 * @returns {z.ZodObject} Schema with strict mode
 */
export function withHttpContext(schema) {
  return schema.strict();
}

/**
 * Applies strict mode for query parameters
 * Note: Numeric coercion must be applied at field definition level
 *
 * @param {z.ZodObject} schema - Base schema
 * @returns {z.ZodObject} Adapted schema for HTTP query params
 */
export function forQueryParams(schema) {
  return schema.strict();
}

/**
 * Applies only strict mode for body parameters
 * (Body params don't need coercion as they're already typed from JSON)
 *
 * @param {z.ZodObject} schema - Base schema
 * @returns {z.ZodObject} Adapted schema for HTTP body
 */
export function forBodyParams(schema) {
  return withHttpContext(schema);
}

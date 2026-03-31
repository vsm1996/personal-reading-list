/**
 * Lightweight input validation helpers for API route handlers.
 *
 * Intentionally dependency-free — no Zod, no external schema library.
 * Each helper throws `ValidationError` on failure so callers can catch once
 * at the route boundary and return a 400 response.
 *
 * ## Design intent
 * These helpers exist at the system boundary (untrusted client input).
 * They enforce:
 *   - Type safety: reject non-string / non-numeric values early.
 *   - Length limits: prevent oversized payloads reaching the database.
 *   - Range constraints: ensure numeric values are within acceptable bounds.
 *
 * They do NOT sanitise for XSS or SQL injection — the ORM (Prisma) handles
 * parameterised queries, and HTML escaping is the responsibility of the
 * rendering layer.
 *
 * ## Usage
 * ```ts
 * try {
 *   const name = requireString(body.name, "name", 100);
 *   const stars = requireIntInRange(body.stars, "stars", 1, 5);
 * } catch (err) {
 *   if (err instanceof ValidationError) return badRequest(err.message);
 *   throw err;
 * }
 * ```
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Asserts value is a non-empty string within maxLength. Returns trimmed value. */
export function requireString(
  value: unknown,
  fieldName: string,
  maxLength = 500
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`"${fieldName}" is required and must be a non-empty string.`);
  }
  if (value.trim().length > maxLength) {
    throw new ValidationError(`"${fieldName}" must be ${maxLength} characters or fewer.`);
  }
  return value.trim();
}

/** Asserts value is an integer within [min, max]. */
export function requireIntInRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(
      `"${fieldName}" must be a whole number between ${min} and ${max}.`
    );
  }
  return n;
}

/** Asserts value is a non-negative integer. */
export function requireNonNegativeInt(value: unknown, fieldName: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new ValidationError(`"${fieldName}" must be a non-negative whole number.`);
  }
  return n;
}

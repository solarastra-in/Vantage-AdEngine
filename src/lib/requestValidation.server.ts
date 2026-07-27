/**
 * requestValidation.server.ts
 *
 * Every endpoint so far has trusted `req.body as { ... }` -- a compile-time
 * type assertion with zero runtime enforcement. A malformed or malicious
 * request (missing field, wrong type, NaN) doesn't get rejected; it flows
 * into the algorithm and produces silent garbage -- e.g. a missing
 * `valuePerConversion` in a budget-reallocation constraint becomes NaN,
 * which JSON.stringify silently turns into `null` in the response, with no
 * error anywhere in the chain.
 *
 * This is a small, dependency-free validator (no zod/joi) rather than
 * pulling in a new package for a handful of endpoint shapes -- deliberately
 * minimal, not a general-purpose schema system.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`"${field}" must be a non-empty string.`);
  }
  return value;
}

export function requireFiniteNumber(value: unknown, field: string, opts: { min?: number; max?: number } = {}): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`"${field}" must be a finite number.`);
  }
  if (opts.min !== undefined && value < opts.min) {
    throw new ValidationError(`"${field}" must be >= ${opts.min}.`);
  }
  if (opts.max !== undefined && value > opts.max) {
    throw new ValidationError(`"${field}" must be <= ${opts.max}.`);
  }
  return value;
}

export function requireArray(value: unknown, field: string, opts: { minLength?: number } = {}): unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`"${field}" must be an array.`);
  }
  if (opts.minLength !== undefined && value.length < opts.minLength) {
    throw new ValidationError(`"${field}" must contain at least ${opts.minLength} item(s).`);
  }
  return value;
}

export function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`"${field}" must be an object.`);
  }
  return value as Record<string, unknown>;
}

/** Wraps a route handler so a thrown ValidationError becomes a clean 400 instead of an unhandled 500. */
export function withValidation(handler: (req: any, res: any) => void | Promise<void>) {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }
  };
}

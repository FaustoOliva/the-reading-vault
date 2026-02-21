/**
 * Form Schema Adapters for Mobile
 *
 * Provides utilities to adapt common base schemas for React Native forms:
 * - String-based number validation (form inputs return strings)
 * - Date object handling
 * - User-friendly Spanish error messages
 * - Progressive validation patterns
 */

import { z } from "zod";

/**
 * Validates a string representation of a number with specific constraints
 * Useful for inputs like score, pages, etc.
 */
export function numericString(options: {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
  multipleOf?: number;
  fieldName?: string;
  required?: boolean;
}) {
  const {
    min,
    max,
    integer = false,
    positive = false,
    multipleOf,
    fieldName = "Campo",
    required = true,
  } = options;

  if (!required) {
    return z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Number(val)), {
        message: `${fieldName} debe ser un número válido`,
      })
      .refine(
        (val) => {
          if (!val) return true;
          const num = Number(val);
          if (min !== undefined && num < min) return false;
          if (max !== undefined && num > max) return false;
          if (positive && num <= 0) return false;
          if (integer && !Number.isInteger(num)) return false;
          if (multipleOf && num % multipleOf !== 0) return false;
          return true;
        },
        { message: `${fieldName} inválido` },
      );
  }

  return z
    .string()
    .trim()
    .min(1, `${fieldName} es requerido`)
    .refine((val) => !isNaN(Number(val)), {
      message: `${fieldName} debe ser un número válido`,
    })
    .refine(
      (val) => {
        const num = Number(val);
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
        if (positive && num <= 0) return false;
        if (integer && !Number.isInteger(num)) return false;
        if (multipleOf && num % multipleOf !== 0) return false;
        return true;
      },
      { message: `${fieldName} inválido` },
    );
}

/**
 * Validates a Date object with constraints
 *
 * @param options - Validation options
 * @returns Schema for Date objects
 */
export function asFormDate(
  options: {
    required?: boolean;
    disallowFuture?: boolean;
    fieldName?: string;
  } = {},
) {
  const { disallowFuture = false, fieldName = "Fecha" } = options;

  let schema = z.date({ message: `${fieldName} es requerida` });

  if (disallowFuture) {
    return schema.refine((date: Date) => date <= new Date(), {
      message: `${fieldName} no puede ser futura`,
    });
  }

  return schema;
}

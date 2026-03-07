/**
 * Filter Validation Schemas and Types
 * Client-side validation for book filters in mobile
 */

/**
 * Validation errors for filter fields
 */
export interface FilterValidationErrors {
  minScore?: string;
  maxScore?: string;
  minPages?: string;
  maxPages?: string;
  publicationYearStart?: string;
  publicationYearEnd?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Raw filter form values (strings from inputs)
 */
export interface RawFilterValues {
  countryId?: number;
  authorId?: number;
  minScore: string;
  maxScore: string;
  minPages: string;
  maxPages: string;
  publicationYearStart: string;
  publicationYearEnd: string;
  startDate: string;
  endDate: string;
}

/**
 * Parse and validate a numeric value
 * @param value String value from input
 * @param min Optional minimum value (inclusive)
 * @param max Optional maximum value (inclusive)
 * @param fieldName Field name for error messages
 * @returns Parsed number or error message
 */
function validateNumber(
  value: string,
  options: {
    min?: number;
    max?: number;
    fieldName: string;
    allowDecimal?: boolean;
  },
): { value: number } | { error: string } {
  if (!value.trim()) {
    return { value: NaN };
  }

  const parsed = options.allowDecimal ? parseFloat(value) : parseInt(value, 10);

  if (isNaN(parsed)) {
    return { error: `${options.fieldName} must be a valid number` };
  }

  if (options.min !== undefined && parsed < options.min) {
    return {
      error: `${options.fieldName} must be at least ${options.min}`,
    };
  }

  if (options.max !== undefined && parsed > options.max) {
    return {
      error: `${options.fieldName} must be at most ${options.max}`,
    };
  }

  return { value: parsed };
}

/**
 * Validate a date string in ISO format (YYYY-MM-DD)
 * @param value ISO date string
 * @param fieldName Field name for error messages
 * @returns Valid Date or error message
 */
function validateDate(
  value: string,
  fieldName: string,
): { value: string } | { error: string } {
  if (!value.trim()) {
    return { value: "" };
  }

  // Check ISO format YYYY-MM-DD
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso8601Regex.test(value)) {
    return { error: `${fieldName} must be in format YYYY-MM-DD` };
  }

  // Validate it's a real date
  const date = new Date(value + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    return { error: `${fieldName} must be a valid date` };
  }

  return { value };
}

/**
 * Validate all filter form values
 * @returns Validation result with errors if any
 */
export function validateFilters(values: RawFilterValues): {
  isValid: boolean;
  errors: FilterValidationErrors;
} {
  const errors: FilterValidationErrors = {};

  // Parse score range
  let minScoreValue: number | undefined;
  let maxScoreValue: number | undefined;

  if (values.minScore) {
    const scoreResult = validateNumber(values.minScore, {
      min: 0,
      max: 10,
      fieldName: "Minimum score",
      allowDecimal: true,
    });
    if ("error" in scoreResult) {
      errors.minScore = scoreResult.error;
    } else if (!isNaN(scoreResult.value)) {
      minScoreValue = scoreResult.value;
    }
  }

  if (values.maxScore) {
    const scoreResult = validateNumber(values.maxScore, {
      min: 0,
      max: 10,
      fieldName: "Maximum score",
      allowDecimal: true,
    });
    if ("error" in scoreResult) {
      errors.maxScore = scoreResult.error;
    } else if (!isNaN(scoreResult.value)) {
      maxScoreValue = scoreResult.value;
    }
  }

  // Validate score range consistency
  if (
    minScoreValue !== undefined &&
    maxScoreValue !== undefined &&
    minScoreValue > maxScoreValue
  ) {
    errors.minScore = "Minimum score must be less than or equal to maximum";
  }

  // Parse page range
  let minPagesValue: number | undefined;
  let maxPagesValue: number | undefined;

  if (values.minPages) {
    const pagesResult = validateNumber(values.minPages, {
      min: 1,
      fieldName: "Minimum pages",
      allowDecimal: false,
    });
    if ("error" in pagesResult) {
      errors.minPages = pagesResult.error;
    } else if (!isNaN(pagesResult.value)) {
      minPagesValue = pagesResult.value;
    }
  }

  if (values.maxPages) {
    const pagesResult = validateNumber(values.maxPages, {
      min: 1,
      fieldName: "Maximum pages",
      allowDecimal: false,
    });
    if ("error" in pagesResult) {
      errors.maxPages = pagesResult.error;
    } else if (!isNaN(pagesResult.value)) {
      maxPagesValue = pagesResult.value;
    }
  }

  // Validate pages range consistency
  if (
    minPagesValue !== undefined &&
    maxPagesValue !== undefined &&
    minPagesValue > maxPagesValue
  ) {
    errors.minPages = "Minimum pages must be less than or equal to maximum";
  }

  // Parse publication year range
  let publicationYearStartValue: number | undefined;
  let publicationYearEndValue: number | undefined;

  if (values.publicationYearStart) {
    const yearResult = validateNumber(values.publicationYearStart, {
      min: 1000,
      max: 9999,
      fieldName: "Start publication year",
      allowDecimal: false,
    });
    if ("error" in yearResult) {
      errors.publicationYearStart = yearResult.error;
    } else if (!isNaN(yearResult.value)) {
      publicationYearStartValue = yearResult.value;
    }
  }

  if (values.publicationYearEnd) {
    const yearResult = validateNumber(values.publicationYearEnd, {
      min: 1000,
      max: 9999,
      fieldName: "End publication year",
      allowDecimal: false,
    });
    if ("error" in yearResult) {
      errors.publicationYearEnd = yearResult.error;
    } else if (!isNaN(yearResult.value)) {
      publicationYearEndValue = yearResult.value;
    }
  }

  if (
    publicationYearStartValue !== undefined &&
    publicationYearEndValue !== undefined &&
    publicationYearStartValue > publicationYearEndValue
  ) {
    errors.publicationYearStart =
      "Start publication year must be less than or equal to end year";
  }

  // Validate dates
  let startDateValue: string | undefined;
  let endDateValue: string | undefined;

  if (values.startDate) {
    const dateResult = validateDate(values.startDate, "Start date");
    if ("error" in dateResult) {
      errors.startDate = dateResult.error;
    } else if (dateResult.value) {
      startDateValue = dateResult.value;
    }
  }

  if (values.endDate) {
    const dateResult = validateDate(values.endDate, "End date");
    if ("error" in dateResult) {
      errors.endDate = dateResult.error;
    } else if (dateResult.value) {
      endDateValue = dateResult.value;
    }
  }

  // Validate date range consistency
  if (startDateValue && endDateValue && startDateValue > endDateValue) {
    errors.startDate = "Start date must be before or equal to end date";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Convert raw string values to proper types for API
 * Assumes validation has passed
 */
export function parseFilterValues(values: RawFilterValues) {
  return {
    countryId: values.countryId,
    authorId: values.authorId,
    minScore: values.minScore ? parseFloat(values.minScore) : undefined,
    maxScore: values.maxScore ? parseFloat(values.maxScore) : undefined,
    minPages: values.minPages ? parseInt(values.minPages, 10) : undefined,
    maxPages: values.maxPages ? parseInt(values.maxPages, 10) : undefined,
    publicationYearStart: values.publicationYearStart
      ? parseInt(values.publicationYearStart, 10)
      : undefined,
    publicationYearEnd: values.publicationYearEnd
      ? parseInt(values.publicationYearEnd, 10)
      : undefined,
    startDate: values.startDate || undefined,
    endDate: values.endDate || undefined,
  };
}

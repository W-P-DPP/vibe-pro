const DEFAULT_SENSITIVE_FIELD_NAMES = [
  'password',
  'passwordciphertext',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
] as const;

export type SanitizeLogValueOptions = {
  sensitiveFieldNames?: Iterable<string>;
  replacement?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeFieldName(name: string) {
  return name.trim().toLowerCase();
}

export function createSensitiveFieldSet(
  fieldNames: Iterable<string> = DEFAULT_SENSITIVE_FIELD_NAMES,
) {
  return new Set(Array.from(fieldNames, normalizeFieldName));
}

export function sanitizeLogValue(
  value: unknown,
  options: SanitizeLogValueOptions = {},
): unknown {
  const replacement = options.replacement ?? '[REDACTED]';
  const sensitiveFieldNames = createSensitiveFieldSet([
    ...DEFAULT_SENSITIVE_FIELD_NAMES,
    ...(options.sensitiveFieldNames ?? []),
  ]);

  const visit = (current: unknown): unknown => {
    if (Array.isArray(current)) {
      return current.map(visit);
    }

    if (!isPlainObject(current)) {
      return current;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(current)) {
      sanitized[key] = sensitiveFieldNames.has(normalizeFieldName(key))
        ? replacement
        : visit(nestedValue);
    }

    return sanitized;
  };

  return visit(value);
}

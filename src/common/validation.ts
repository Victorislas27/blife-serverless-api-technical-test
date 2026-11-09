import { BadRequestError } from './errors';

/**
 * Expresión regular estándar para validar UUID (v1 a v5).
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Verifica si un string es un UUID válido.
 */
export const isValidUuid = (value: string | null | undefined): boolean => {
  if (!value || typeof value !== 'string') return false;
  return UUID_REGEX.test(value.trim());
};

/**
 * Valida que un parámetro sea un UUID válido; arroja BadRequestError si no lo es.
 */
export const validateUuid = (value: string | null | undefined, paramName = 'id'): string => {
  if (!isValidUuid(value)) {
    throw new BadRequestError(`El parámetro "${paramName}" debe ser un UUID válido.`);
  }
  return value!.trim();
};


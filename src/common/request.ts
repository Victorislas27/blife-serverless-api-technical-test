import { BadRequestError } from './errors';

/**
 * Parsea de manera segura el cuerpo JSON de un evento de API Gateway.
 * Arroja un BadRequestError si el cuerpo está vacío o si el JSON está malformado.
 *
 * @param body Cadena JSON proveniente de event.body
 * @returns Objeto parseado tipado como T
 */
export const parseBody = <T = any>(body: string | null | undefined): T => {
  if (!body || !body.trim()) {
    throw new BadRequestError('El cuerpo de la solicitud no puede estar vacío.');
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new BadRequestError('Formato JSON inválido en el cuerpo de la solicitud.');
  }
};


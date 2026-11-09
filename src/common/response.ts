import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Encabezados CORS universales para permitir comunicación fluida con el frontend Nuxt / Quasar.
 */
export const defaultCorsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

/**
 * Genera una respuesta HTTP exitosa (200, 201, etc.) en formato estándar para Amazon API Gateway.
 *
 * @param data Cuerpo de datos a retornar
 * @param statusCode Código de estado HTTP (por defecto 200)
 */
export const successResponse = (
  data: any,
  statusCode = 200
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: defaultCorsHeaders,
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
};

/**
 * Genera una respuesta HTTP de error con mensaje descriptivo y código adecuado.
 *
 * @param message Mensaje de error para el cliente
 * @param statusCode Código de estado HTTP (400, 404, 409, 500, etc.)
 * @param details Detalles adicionales opcionales
 */
export const errorResponse = (
  message: string,
  statusCode = 500,
  details: any = null
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: defaultCorsHeaders,
    body: JSON.stringify({
      success: false,
      error: {
        message,
        statusCode,
        details,
      },
    }),
  };
};

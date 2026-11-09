import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { defaultCorsHeaders, errorResponse } from './common/response';
import { productsHandler } from './modules/products/product.handler';
import { salesHandler } from './modules/sales/sale.handler';

/**
 * Manejador principal Lambda para la API REST de B-Life.
 * Despacha las solicitudes hacia los controladores de dominio correspondientes.
 *
 * @param event Evento de Amazon API Gateway
 * @returns Respuesta HTTP estándar con código de estado y cuerpo JSON
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: defaultCorsHeaders,
      body: '',
    };
  }

  const path = event.path || '';

  if (path === '/' || path === '/api' || path === '/api/health') {
    return {
      statusCode: 200,
      headers: defaultCorsHeaders,
      body: JSON.stringify({
        message: 'B-Life Serverless REST API activa y en funcionamiento',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'dev',
        timestamp: new Date().toISOString(),
      }),
    };
  }

  if (path.startsWith('/api/products')) {
    return await productsHandler(event);
  }
  if (path.startsWith('/api/sales')) {
    return await salesHandler(event);
  }

  return errorResponse(`Recurso no encontrado: ${event.httpMethod} ${path}`, 404);
};

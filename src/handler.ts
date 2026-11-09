import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Manejador principal Lambda para la API REST de B-Life.
 * Despacha las solicitudes hacia los controladores correspondientes.
 *
 * @param event Evento de Amazon API Gateway
 * @returns Respuesta HTTP estándar con código de estado y cuerpo JSON
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      message: 'B-Life Serverless REST API activa y en funcionamiento',
      timestamp: new Date().toISOString(),
      path: event.path,
      httpMethod: event.httpMethod,
    }),
  };
};

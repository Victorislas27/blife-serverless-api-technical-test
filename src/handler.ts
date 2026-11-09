import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { defaultCorsHeaders, errorResponse } from "./common/response";
import { productsHandler } from "./modules/products/product.handler";
import { salesHandler } from "./modules/sales/sale.handler";
import { indicatorsHandler } from "./modules/indicators/indicator.handler";

type SubHandler = (
  event: APIGatewayProxyEvent,
  context?: Context
) => Promise<APIGatewayProxyResult>;

/**
 * Tabla de enrutamiento por prefijo de módulo.
 */
const moduleRouters: Record<string, SubHandler> = {
  "/api/products": productsHandler,
  "/api/sales": salesHandler,
  "/api/indicators": indicatorsHandler,
};

/**
 * Manejador principal Lambda para la API REST de B-Life.
 * Despacha las solicitudes hacia los controladores de dominio correspondientes.
 *
 * @param event Evento de Amazon API Gateway
 * @param context Contexto de ejecución de AWS Lambda
 * @returns Respuesta HTTP estándar con código de estado y cuerpo JSON
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyResult> => {
  // 1. Evita que la función quede colgada esperando eventos pendientes en el loop (ej. pool de PostgreSQL)
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  // 2. Manejo de preflight CORS (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: defaultCorsHeaders,
      body: "",
    };
  }

  const path = event.path || "";

  // 3. Verificación de salud y raíz
  if (path === "/" || path === "/api" || path === "/api/health") {
    return {
      statusCode: 200,
      headers: defaultCorsHeaders,
      body: JSON.stringify({
        message: "B-Life Serverless REST API activa y en funcionamiento",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "dev",
        timestamp: new Date().toISOString(),
      }),
    };
  }

  // 4. Despacho dinámico a los sub-manejadores de dominio con delimitador exacto de ruta
  for (const [prefix, subHandler] of Object.entries(moduleRouters)) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return await subHandler(event, context);
    }
  }

  // 5. Ruta no encontrada
  return errorResponse(
    `Recurso no encontrado: ${event.httpMethod} ${path}`,
    404
  );
};

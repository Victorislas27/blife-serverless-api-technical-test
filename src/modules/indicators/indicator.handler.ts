import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { IndicatorService } from './indicator.service';
import { successResponse, errorResponse } from '../../common/response';
import { AppError } from '../../common/errors';

/**
 * Instancia singleton reutilizable entre invocaciones cálidas (Warm Starts).
 */
const indicatorService = new IndicatorService();

type QueryParams = Record<string, string | undefined>;
type IndicatorRouteAction = (params: QueryParams) => Promise<unknown>;

/**
 * Diccionario de rutas para el módulo de indicadores.
 * Facilita el mantenimiento, evita cadenas de if-else y elimina falsos positivos en URLs.
 */
const indicatorRoutes: Record<string, IndicatorRouteAction> = {
  '/top-products': (q) =>
    indicatorService.getTopProducts({
      startDate: q.startDate,
      endDate: q.endDate,
      channel: q.channel,
      limit: q.limit ? Math.max(1, parseInt(q.limit, 10) || 5) : 5,
    }),

  '/profitability': (q) =>
    indicatorService.getProfitability({
      startDate: q.startDate,
      endDate: q.endDate,
      channel: q.channel,
      groupBy: (q.groupBy as any) || 'total',
    }),

  '/utility': (q) =>
    indicatorService.getProfitability({
      startDate: q.startDate,
      endDate: q.endDate,
      channel: q.channel,
      groupBy: (q.groupBy as any) || 'total',
    }),

  '/top-channels': (q) =>
    indicatorService.getTopChannels({
      startDate: q.startDate,
      endDate: q.endDate,
    }),

  '/recommendations': (q) =>
    indicatorService.getRecommendations({
      productId: q.productId,
      category: q.category,
      limit: q.limit ? Math.max(1, parseInt(q.limit, 10) || 4) : 4,
    }),
};

/**
 * Despachador Lambda para el cálculo de Indicadores de Rendimiento (KPIs).
 *
 * @param event Evento de Amazon API Gateway
 * @param context Contexto de ejecución de AWS Lambda (opcional)
 */
export const indicatorsHandler = async (
  event: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyResult> => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  const method = event.httpMethod;
  const path = event.path || '';
  const q = event.queryStringParameters || {};

  if (method !== 'GET') {
    return errorResponse(`Método ${method} no permitido para indicadores. Se requiere GET.`, 405);
  }

  try {
    // Normalización de subruta exacta dentro de /api/indicators
    // e.g. "/api/indicators/top-products" -> "/top-products"
    const subPath = path.startsWith('/api/indicators')
      ? path.slice('/api/indicators'.length)
      : path;

    const action = indicatorRoutes[subPath];

    if (!action) {
      return errorResponse(`Recurso de indicador no encontrado para ${path}`, 404);
    }

    const result = await action(q);
    return successResponse(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error(`[IndicatorsHandler Error] ${path}:`, error);
    return errorResponse(
      'Error interno al calcular indicadores de negocio.',
      500,
      process.env.NODE_ENV === 'production' ? null : error.message
    );
  }
};

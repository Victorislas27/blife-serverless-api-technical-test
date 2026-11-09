import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { IndicatorService } from './indicator.service';
import { successResponse, errorResponse } from '../../common/response';
import { AppError } from '../../common/errors';

const indicatorService = new IndicatorService();

export const indicatorsHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path;
  const q = event.queryStringParameters || {};

  if (method !== 'GET') {
    return errorResponse(`Método ${method} no permitido para indicadores. Se requiere GET.`, 405);
  }

  try {
    // 1. GET /api/indicators/top-products
    if (path.endsWith('/top-products')) {
      const filters = {
        startDate: q.startDate,
        endDate: q.endDate,
        channel: q.channel,
        limit: q.limit ? parseInt(q.limit, 10) : 5,
      };
      const result = await indicatorService.getTopProducts(filters);
      return successResponse(result);
    }

    // 2. GET /api/indicators/profitability (Cuál es mi utilidad)
    if (path.endsWith('/profitability') || path.endsWith('/utility')) {
      const filters = {
        startDate: q.startDate,
        endDate: q.endDate,
        channel: q.channel,
        groupBy: (q.groupBy as any) || 'total',
      };
      const result = await indicatorService.getProfitability(filters);
      return successResponse(result);
    }

    // 3. GET /api/indicators/top-channels
    if (path.endsWith('/top-channels')) {
      const filters = {
        startDate: q.startDate,
        endDate: q.endDate,
      };
      const result = await indicatorService.getTopChannels(filters);
      return successResponse(result);
    }

    // 4. GET /api/indicators/recommendations
    if (path.endsWith('/recommendations')) {
      const filters = {
        productId: q.productId,
        category: q.category,
        limit: q.limit ? parseInt(q.limit, 10) : 4,
      };
      const result = await indicatorService.getRecommendations(filters);
      return successResponse(result);
    }

    return errorResponse(`Recurso de indicador no encontrado para ${path}`, 404);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error(`[IndicatorsHandler Error] ${path}:`, error);
    return errorResponse('Error interno al calcular indicadores de negocio.', 500, error.message);
  }
};

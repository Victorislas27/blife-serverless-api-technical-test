import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SaleService } from './sale.service';
import { successResponse, errorResponse } from '../../common/response';
import { parseBody } from '../../common/request';
import { validateUuid } from '../../common/validation';
import { logger } from '../../common/logger';
import { AppError } from '../../common/errors';

const saleService = new SaleService();

/**
 * Despachador Lambda para el registro y consulta del módulo de Ventas.
 *
 * @param event Evento de Amazon API Gateway
 * @param context Contexto de ejecución de AWS Lambda (opcional)
 */
export const salesHandler = async (
  event: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyResult> => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  const method = event.httpMethod;
  const path = event.path;
  const pathParts = path.split('/').filter(Boolean); // e.g. ['api', 'sales'] o ['api', 'sales', '{id}']

  try {
    // 1. GET /api/sales/{id}
    if (method === 'GET' && pathParts.length === 3) {
      const id = validateUuid(pathParts[2], 'id');
      const sale = await saleService.getSaleById(id);
      return successResponse(sale);
    }

    // 2. GET /api/sales (Listar ventas con filtros)
    if (method === 'GET' && pathParts.length === 2) {
      const q = event.queryStringParameters || {};
      const filters = {
        channel: q.channel,
        status: q.status,
        startDate: q.startDate,
        endDate: q.endDate,
        page: q.page ? Math.max(1, parseInt(q.page, 10) || 1) : 1,
        limit: q.limit ? Math.max(1, parseInt(q.limit, 10) || 10) : 10,
      };
      const result = await saleService.listSales(filters);
      return successResponse(result);
    }

    // 3. POST /api/sales (Registrar nueva venta con soporte de idempotencia)
    if (method === 'POST') {
      const body = parseBody(event.body);
      const idempotencyKey =
        event.headers?.['idempotency-key'] ||
        event.headers?.['Idempotency-Key'] ||
        event.headers?.['x-idempotency-key'] ||
        (body as any)?.idempotencyKey;

      const createdSale = await saleService.createSale({
        ...body,
        idempotencyKey,
      });
      return successResponse(createdSale, 201);
    }

    return errorResponse(`Ruta no encontrada para ${method} ${path}`, 404);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    if (error.code === '22P02') {
      return errorResponse('Identificador provisto con formato inválido.', 400);
    }
    logger.error('Error al procesar la solicitud de ventas', error, {
      method,
      path,
      requestId: context?.awsRequestId,
    });
    return errorResponse(
      'Error interno al procesar la solicitud de ventas.',
      500,
      process.env.NODE_ENV === 'production' ? null : error.message
    );
  }
};

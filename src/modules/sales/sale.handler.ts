import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SaleService } from './sale.service';
import { successResponse, errorResponse } from '../../common/response';
import { AppError } from '../../common/errors';

const saleService = new SaleService();

export const salesHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path;
  const pathParts = path.split('/').filter(Boolean); // e.g. ['api', 'sales'] o ['api', 'sales', '{id}']

  try {
    // 1. GET /api/sales/{id}
    if (method === 'GET' && pathParts.length === 3) {
      const id = pathParts[2];
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
        page: q.page ? parseInt(q.page, 10) : 1,
        limit: q.limit ? parseInt(q.limit, 10) : 10,
      };
      const result = await saleService.listSales(filters);
      return successResponse(result);
    }

    // 3. POST /api/sales (Registrar nueva venta)
    if (method === 'POST') {
      if (!event.body) {
        return errorResponse('El cuerpo de la solicitud no puede estar vacío.', 400);
      }
      const body = JSON.parse(event.body);
      const createdSale = await saleService.createSale(body);
      return successResponse(createdSale, 201);
    }

    return errorResponse(`Ruta no encontrada para ${method} ${path}`, 404);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error(`[SalesHandler Error] ${method} ${path}:`, error);
    return errorResponse('Error interno al procesar la solicitud de ventas.', 500, error.message);
  }
};

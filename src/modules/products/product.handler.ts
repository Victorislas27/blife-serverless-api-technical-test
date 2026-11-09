import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ProductService } from './product.service';
import { successResponse, errorResponse } from '../../common/response';
import { parseBody } from '../../common/request';
import { validateUuid } from '../../common/validation';
import { AppError } from '../../common/errors';

const productService = new ProductService();

/**
 * Despachador Lambda para las operaciones CRUD y búsquedas del módulo de Productos.
 *
 * @param event Evento de Amazon API Gateway
 * @param context Contexto de ejecución de AWS Lambda (opcional)
 */
export const productsHandler = async (
  event: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyResult> => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  const method = event.httpMethod;
  const path = event.path;
  const pathParts = path.split('/').filter(Boolean);

  try {
    // 1. GET /api/products/sku/{sku}
    if (method === 'GET' && pathParts.length >= 4 && pathParts[2] === 'sku') {
      const sku = decodeURIComponent(pathParts[3]);
      const result = await productService.getProductBySku(sku);
      return successResponse(result);
    }

    // 2. GET /api/products/{id}
    if (method === 'GET' && pathParts.length === 3 && pathParts[2] !== 'sku') {
      const id = validateUuid(pathParts[2], 'id');
      const product = await productService.getProductById(id);
      return successResponse(product);
    }

    // 3. GET /api/products (Listar con filtros)
    if (method === 'GET' && pathParts.length === 2) {
      const q = event.queryStringParameters || {};
      const filters = {
        category: q.category,
        search: q.search,
        brand: q.brand,
        status: q.status,
        minPrice: q.minPrice ? parseFloat(q.minPrice) : undefined,
        maxPrice: q.maxPrice ? parseFloat(q.maxPrice) : undefined,
        page: q.page ? Math.max(1, parseInt(q.page, 10) || 1) : 1,
        limit: q.limit ? Math.max(1, parseInt(q.limit, 10) || 10) : 10,
      };
      const result = await productService.listProducts(filters);
      return successResponse(result);
    }

    // 4. POST /api/products (Crear producto con variantes)
    if (method === 'POST') {
      const body = parseBody(event.body);
      const created = await productService.createProduct(body);
      return successResponse(created, 201);
    }

    // 5. PUT /api/products/{id} (Actualizar producto y/o variantes)
    if (method === 'PUT' && pathParts.length === 3) {
      const id = validateUuid(pathParts[2], 'id');
      const body = parseBody(event.body);
      const updated = await productService.updateProduct(id, body);
      return successResponse(updated);
    }

    // 6. DELETE /api/products/{id}
    if (method === 'DELETE' && pathParts.length === 3) {
      const id = validateUuid(pathParts[2], 'id');
      const res = await productService.deleteProduct(id);
      return successResponse(res);
    }

    return errorResponse(`Ruta no encontrada para ${method} ${path}`, 404);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    // Captura específica para errores de sintaxis en tipos de datos de PostgreSQL (ej. UUID)
    if (error.code === '22P02') {
      return errorResponse('Identificador provisto con formato inválido.', 400);
    }
    // Captura de violación de llave foránea (ej. eliminar producto o variante con ventas asociadas)
    if (error.code === '23503') {
      return errorResponse(
        'No es posible eliminar o modificar el recurso porque tiene registros relacionados en el historial (ej. ventas asociadas). Puedes desactivarlo cambiando su estado.',
        409
      );
    }
    console.error(`[ProductsHandler Error] ${method} ${path}:`, error);
    return errorResponse(
      'Error interno al procesar la solicitud de productos.',
      500,
      process.env.NODE_ENV === 'production' ? null : error.message
    );
  }
};

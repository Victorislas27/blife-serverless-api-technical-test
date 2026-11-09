import { indicatorsHandler } from '../src/modules/indicators/indicator.handler';
import { productsHandler } from '../src/modules/products/product.handler';
import { salesHandler } from '../src/modules/sales/sale.handler';
import { handler } from '../src/handler';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

const mockValidUuid1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const mockValidUuid2 = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

// Mock del servicio de indicadores
jest.mock('../src/modules/indicators/indicator.service', () => {
  return {
    IndicatorService: jest.fn().mockImplementation(() => ({
      getTopProducts: jest.fn().mockResolvedValue([
        { productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', productName: 'Citrato de Magnesio', totalUnitsSold: 100 }
      ]),
      getProfitability: jest.fn().mockResolvedValue({
        revenue: 10000,
        cost: 4000,
        grossProfit: 6000,
        marginPercentage: 60
      }),
      getTopChannels: jest.fn().mockResolvedValue([
        { channel: 'Amazon', revenue: 50000, percentage: 50 }
      ]),
      getRecommendations: jest.fn().mockResolvedValue([
        { productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', productName: 'Omega 3', score: 0.95 }
      ]),
    })),
  };
});

// Mock del servicio de productos
jest.mock('../src/modules/products/product.service', () => {
  return {
    ProductService: jest.fn().mockImplementation(() => ({
      getProductBySku: jest.fn().mockResolvedValue({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Citrato de Magnesio', sku: 'BL-CIT-01' }),
      getProductById: jest.fn().mockResolvedValue({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Citrato de Magnesio' }),
      listProducts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      createProduct: jest.fn().mockResolvedValue({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Nuevo Producto' }),
      updateProduct: jest.fn().mockResolvedValue({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Producto Actualizado' }),
      deleteProduct: jest.fn().mockResolvedValue({ success: true, message: 'Producto eliminado' }),
    })),
  };
});

// Mock del servicio de ventas
jest.mock('../src/modules/sales/sale.service', () => {
  return {
    SaleService: jest.fn().mockImplementation(() => ({
      getSaleById: jest.fn().mockResolvedValue({ id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', customerName: 'Juan Perez', total: 1500 }),
      listSales: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      createSale: jest.fn().mockResolvedValue({ id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', total: 500 }),
    })),
  };
});

describe('AWS Lambda Handlers Unit Tests', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:...',
    memoryLimitInMB: '256',
    awsRequestId: 'req-123',
    logGroupName: 'log-group',
    logStreamName: 'log-stream',
    getRemainingTimeInMillis: () => 5000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  describe('Main handler (src/handler.ts)', () => {
    it('debe responder 200 en peticiones preflight OPTIONS', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        path: '/api/indicators/top-products',
      } as APIGatewayProxyEvent;

      const res = await handler(event, mockContext);
      expect(res.statusCode).toBe(200);
      expect(mockContext.callbackWaitsForEmptyEventLoop).toBe(false);
    });

    it('debe responder 200 en el health check (/api/health)', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/health',
      } as APIGatewayProxyEvent;

      const res = await handler(event, mockContext);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('B-Life Serverless REST API');
    });

    it('debe responder 404 para rutas no reconocidas', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/desconocido',
      } as APIGatewayProxyEvent;

      const res = await handler(event, mockContext);
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    it('no debe permitir falsos positivos de prefijos como /api/productsfoo', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/productsfoo',
      } as APIGatewayProxyEvent;

      const res = await handler(event, mockContext);
      expect(res.statusCode).toBe(404);
    });

    it('debe despachar correctamente a /api/products/{id} con UUID válido', async () => {
      const event = {
        httpMethod: 'GET',
        path: `/api/products/${mockValidUuid1}`,
      } as APIGatewayProxyEvent;

      const res = await handler(event, mockContext);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(mockValidUuid1);
    });

    it('debe despachar correctamente a /api/sales/{id} con UUID válido', async () => {
      const event = {
        httpMethod: 'GET',
        path: `/api/sales/${mockValidUuid2}`,
      } as APIGatewayProxyEvent;

      const res = await handler(event, mockContext);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(mockValidUuid2);
    });
  });

  describe('indicatorsHandler (src/modules/indicators/indicator.handler.ts)', () => {
    it('debe rechazar métodos distintos a GET con código 405', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/indicators/top-products',
      } as APIGatewayProxyEvent;

      const res = await indicatorsHandler(event, mockContext);
      expect(res.statusCode).toBe(405);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Método POST no permitido');
    });

    it('debe retornar 404 si la sub-ruta de indicador no existe', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/indicators/ruta-inexistente',
      } as APIGatewayProxyEvent;

      const res = await indicatorsHandler(event, mockContext);
      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 404 en subrutas anidadas no reconocidas como /api/indicators/x/top-products', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/indicators/x/top-products',
      } as APIGatewayProxyEvent;

      const res = await indicatorsHandler(event, mockContext);
      expect(res.statusCode).toBe(404);
    });

    it('debe responder 200 y datos al consultar /top-products', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/indicators/top-products',
        queryStringParameters: { limit: '5' },
      } as unknown as APIGatewayProxyEvent;

      const res = await indicatorsHandler(event, mockContext);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].productName).toBe('Citrato de Magnesio');
    });

    it('debe responder 200 y datos al consultar /profitability', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/indicators/profitability',
        queryStringParameters: { groupBy: 'channel' },
      } as unknown as APIGatewayProxyEvent;

      const res = await indicatorsHandler(event, mockContext);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.grossProfit).toBe(6000);
    });

    it('debe responder 200 y datos al consultar /top-channels', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/indicators/top-channels',
      } as unknown as APIGatewayProxyEvent;

      const res = await indicatorsHandler(event, mockContext);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data[0].channel).toBe('Amazon');
    });

    it('debe responder 200 y datos al consultar /recommendations', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/indicators/recommendations',
        queryStringParameters: { productId: mockValidUuid1, limit: '3' },
      } as unknown as APIGatewayProxyEvent;

      const res = await indicatorsHandler(event, mockContext);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data[0].productName).toBe('Omega 3');
    });
  });

  describe('productsHandler (src/modules/products/product.handler.ts)', () => {
    it('debe responder 400 si se envía un ID que no es un UUID válido', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/products/id-invalido-123',
      } as APIGatewayProxyEvent;

      const res = await productsHandler(event, mockContext);
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('UUID válido');
    });

    it('debe responder 400 si el cuerpo en POST está vacío', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/products',
        body: null,
      } as APIGatewayProxyEvent;

      const res = await productsHandler(event, mockContext);
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('no puede estar vacío');
    });

    it('debe responder 400 si el JSON en POST está malformado', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/products',
        body: '{ nombre: "inválido sin comillas" ',
      } as APIGatewayProxyEvent;

      const res = await productsHandler(event, mockContext);
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('Formato JSON inválido');
    });

    it('debe crear un producto con código 201 en POST válido', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/products',
        body: JSON.stringify({ name: 'Nuevo Producto' }),
      } as APIGatewayProxyEvent;

      const res = await productsHandler(event, mockContext);
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(mockValidUuid1);
    });

    it('debe consultar producto por SKU en /api/products/sku/{sku}', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/products/sku/BL-CIT-01',
      } as APIGatewayProxyEvent;

      const res = await productsHandler(event, mockContext);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.sku).toBe('BL-CIT-01');
    });
  });

  describe('salesHandler (src/modules/sales/sale.handler.ts)', () => {
    it('debe responder 400 si se envía un ID de venta que no es un UUID válido', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/sales/id-venta-invalido',
      } as APIGatewayProxyEvent;

      const res = await salesHandler(event, mockContext);
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('UUID válido');
    });

    it('debe responder 400 si el JSON en POST está malformado', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/sales',
        body: 'invalid-json',
      } as APIGatewayProxyEvent;

      const res = await salesHandler(event, mockContext);
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('Formato JSON inválido');
    });

    it('debe registrar venta con código 201 en POST válido', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/sales',
        body: JSON.stringify({ channel: 'Mercado Libre', customerName: 'Pedro' }),
      } as APIGatewayProxyEvent;

      const res = await salesHandler(event, mockContext);
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(mockValidUuid2);
    });
  });
});

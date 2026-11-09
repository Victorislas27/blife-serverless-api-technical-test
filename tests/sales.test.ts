import { SaleService } from '../src/modules/sales/sale.service';
import { SaleRepository } from '../src/modules/sales/sale.repository';
import { CreateSaleDto } from '../src/modules/sales/sale.types';
import { BadRequestError, NotFoundError } from '../src/common/errors';

describe('SaleService Unit Tests', () => {
  let saleService: SaleService;
  let mockRepository: jest.Mocked<SaleRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    } as any;

    saleService = new SaleService(mockRepository);
  });

  describe('createSale', () => {
    it('debe rechazar una venta sin canal especificado', async () => {
      const dto: CreateSaleDto = {
        channel: '',
        customerName: 'Juan Pérez',
        items: [{ sku: 'BL-MAG-60CAP', quantity: 1 }],
      };

      await expect(saleService.createSale(dto)).rejects.toThrow(BadRequestError);
      await expect(saleService.createSale(dto)).rejects.toThrow('El canal de venta es obligatorio');
    });

    it('debe rechazar una venta sin nombre de cliente', async () => {
      const dto: CreateSaleDto = {
        channel: 'AMAZON_MX',
        customerName: '   ',
        items: [{ sku: 'BL-MAG-60CAP', quantity: 1 }],
      };

      await expect(saleService.createSale(dto)).rejects.toThrow(BadRequestError);
      await expect(saleService.createSale(dto)).rejects.toThrow('El nombre del cliente es obligatorio');
    });

    it('debe rechazar una venta sin partidas o items', async () => {
      const dto: CreateSaleDto = {
        channel: 'MERCADOLIBRE',
        customerName: 'Ana López',
        items: [],
      };

      await expect(saleService.createSale(dto)).rejects.toThrow(BadRequestError);
      await expect(saleService.createSale(dto)).rejects.toThrow('al menos un producto/variante');
    });

    it('debe rechazar items con cantidades negativas o cero', async () => {
      const dto: CreateSaleDto = {
        channel: 'BLIFE_SHOPIFY',
        customerName: 'Laura Torres',
        items: [{ sku: 'BL-MAG-60CAP', quantity: 0 }],
      };

      await expect(saleService.createSale(dto)).rejects.toThrow(BadRequestError);
      await expect(saleService.createSale(dto)).rejects.toThrow('debe ser un entero positivo');
    });

    it('debe registrar una venta exitosa calculando totales correctamente', async () => {
      const expectedSale = {
        id: 'sale-uuid-1',
        saleNumber: 'VTA-2026-0001',
        channel: 'AMAZON_MX',
        customerName: 'Carlos Mendoza',
        status: 'COMPLETED' as const,
        totalAmount: 848.00,
        totalCost: 290.00,
        saleDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: [
          {
            id: 'item-1',
            saleId: 'sale-uuid-1',
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'BL-MAG-60CAP',
            quantity: 1,
            unitPrice: 349.00,
            unitCost: 120.00,
            subtotalAmount: 349.00,
            subtotalCost: 120.00,
          },
          {
            id: 'item-2',
            saleId: 'sale-uuid-1',
            productId: 'prod-2',
            variantId: 'var-2',
            sku: 'BL-COL-BERRY-500G',
            quantity: 1,
            unitPrice: 499.00,
            unitCost: 170.00,
            subtotalAmount: 499.00,
            subtotalCost: 170.00,
          },
        ],
      };

      mockRepository.create.mockResolvedValue(expectedSale);

      const result = await saleService.createSale({
        channel: 'AMAZON_MX',
        customerName: 'Carlos Mendoza',
        items: [
          { sku: 'BL-MAG-60CAP', quantity: 1 },
          { sku: 'BL-COL-BERRY-500G', quantity: 1 },
        ],
      });

      expect(result).toEqual(expectedSale);
      expect(result.totalAmount).toBe(848.00);
      expect(result.totalCost).toBe(290.00);
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSaleById', () => {
    it('debe arrojar NotFoundError si la venta no existe', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(saleService.getSaleById('id-no-existente')).rejects.toThrow(NotFoundError);
    });
  });
});

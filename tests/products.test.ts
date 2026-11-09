import { ProductService } from '../src/modules/products/product.service';
import { ProductRepository } from '../src/modules/products/product.repository';
import { CreateProductDto } from '../src/modules/products/product.types';
import { BadRequestError, ConflictError, NotFoundError } from '../src/common/errors';

describe('ProductService Unit Tests', () => {
  let productService: ProductService;
  let mockRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    mockRepository = {
      skuExists: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    productService = new ProductService(mockRepository);
  });

  describe('createProduct', () => {
    it('debe rechazar un producto sin nombre', async () => {
      const dto: CreateProductDto = {
        name: '',
        category: 'Minerales',
        variants: [
          { sku: 'BL-MAG-60', variantName: '60 caps', price: 349, cost: 120, stock: 50 },
        ],
      };

      await expect(productService.createProduct(dto)).rejects.toThrow(BadRequestError);
      await expect(productService.createProduct(dto)).rejects.toThrow('El nombre del producto es obligatorio');
    });

    it('debe rechazar un producto sin variantes', async () => {
      const dto: CreateProductDto = {
        name: 'Citrato de Magnesio',
        category: 'Minerales',
        variants: [],
      };

      await expect(productService.createProduct(dto)).rejects.toThrow(BadRequestError);
      await expect(productService.createProduct(dto)).rejects.toThrow('al menos una variante');
    });

    it('debe rechazar variantes con SKUs duplicados en la misma petición', async () => {
      const dto: CreateProductDto = {
        name: 'Citrato de Magnesio',
        category: 'Minerales',
        variants: [
          { sku: 'BL-MAG-DUPLICADO', variantName: 'Opción 1', price: 300, cost: 100, stock: 10 },
          { sku: 'BL-MAG-DUPLICADO', variantName: 'Opción 2', price: 300, cost: 100, stock: 10 },
        ],
      };

      await expect(productService.createProduct(dto)).rejects.toThrow(BadRequestError);
      await expect(productService.createProduct(dto)).rejects.toThrow('duplicado');
    });

    it('debe rechazar variantes con precio o costo negativo', async () => {
      const dto: CreateProductDto = {
        name: 'Omega 3',
        category: 'Cardiovascular',
        variants: [
          { sku: 'BL-OMG-TEST', variantName: '90 caps', price: -50, cost: 100, stock: 10 },
        ],
      };

      await expect(productService.createProduct(dto)).rejects.toThrow(BadRequestError);
      await expect(productService.createProduct(dto)).rejects.toThrow('no pueden ser negativos');
    });

    it('debe rechazar variantes con SKU que ya existe en la base de datos', async () => {
      mockRepository.skuExists.mockResolvedValue(true);

      const dto: CreateProductDto = {
        name: 'Omega 3',
        category: 'Cardiovascular',
        variants: [
          { sku: 'BL-OMG-EXISTENTE', variantName: '90 caps', price: 389, cost: 130, stock: 20 },
        ],
      };

      await expect(productService.createProduct(dto)).rejects.toThrow(ConflictError);
      await expect(productService.createProduct(dto)).rejects.toThrow('ya se encuentra registrado');
    });

    it('debe crear un producto exitosamente cuando todas las variantes tienen SKU válido y único', async () => {
      mockRepository.skuExists.mockResolvedValue(false);
      const expectedProduct = {
        id: 'prod-uuid-1',
        name: 'Citrato de Magnesio',
        description: 'Suplemento puro',
        category: 'Minerales',
        brand: 'B-Life',
        status: 'ACTIVE' as const,
        variants: [
          {
            id: 'var-uuid-1',
            productId: 'prod-uuid-1',
            sku: 'BL-MAG-60CAP',
            variantName: '60 Cápsulas',
            price: 349,
            cost: 120,
            stock: 80,
            attributes: { conteo: 60 },
          },
        ],
      };

      mockRepository.create.mockResolvedValue(expectedProduct);

      const result = await productService.createProduct({
        name: 'Citrato de Magnesio',
        description: 'Suplemento puro',
        category: 'Minerales',
        variants: [
          {
            sku: 'BL-MAG-60CAP',
            variantName: '60 Cápsulas',
            price: 349,
            cost: 120,
            stock: 80,
            attributes: { conteo: 60 },
          },
        ],
      });

      expect(result).toEqual(expectedProduct);
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProductBySku', () => {
    it('debe retornar la variante y su producto padre cuando el SKU existe', async () => {
      const mockResult = {
        product: {
          id: 'prod-1',
          name: 'Colágeno',
          description: '',
          category: 'Belleza',
          brand: 'B-Life',
          status: 'ACTIVE' as const,
        },
        variant: {
          id: 'var-1',
          productId: 'prod-1',
          sku: 'BL-COL-BERRY-500G',
          variantName: 'Polvo 500g',
          price: 499,
          cost: 170,
          stock: 100,
          attributes: {},
        },
      };

      mockRepository.findBySku.mockResolvedValue(mockResult);

      const res = await productService.getProductBySku('BL-COL-BERRY-500G');
      expect(res.variant.sku).toBe('BL-COL-BERRY-500G');
      expect(res.product.name).toBe('Colágeno');
    });

    it('debe arrojar NotFoundError cuando el SKU no existe', async () => {
      mockRepository.findBySku.mockResolvedValue(null);

      await expect(productService.getProductBySku('SKU-INEXISTENTE')).rejects.toThrow(NotFoundError);
    });
  });
});

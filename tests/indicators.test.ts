import { IndicatorService } from '../src/modules/indicators/indicator.service';
import { IndicatorRepository } from '../src/modules/indicators/indicator.repository';

describe('IndicatorService Unit Tests', () => {
  let indicatorService: IndicatorService;
  let mockRepository: jest.Mocked<IndicatorRepository>;

  beforeEach(() => {
    mockRepository = {
      getTopSellingProducts: jest.fn(),
      getProfitability: jest.fn(),
      getTopChannels: jest.fn(),
      getRecommendationsByProductId: jest.fn(),
      getPopularRecommendations: jest.fn(),
    } as any;

    indicatorService = new IndicatorService(mockRepository);
  });

  describe('getTopProducts', () => {
    it('debe retornar los productos más vendidos ordenados por unidades e ingresos', async () => {
      const mockTop = [
        {
          productId: 'p-1',
          productName: 'Citrato de Magnesio',
          category: 'Minerales',
          brand: 'B-Life',
          totalUnitsSold: 250,
          totalRevenue: 87250,
        },
        {
          productId: 'p-2',
          productName: 'Colágeno Hidrolizado',
          category: 'Belleza',
          brand: 'B-Life',
          totalUnitsSold: 180,
          totalRevenue: 89820,
        },
      ];

      mockRepository.getTopSellingProducts.mockResolvedValue(mockTop);

      const result = await indicatorService.getTopProducts({ limit: 2 });
      expect(result).toHaveLength(2);
      expect(result[0].productName).toBe('Citrato de Magnesio');
      expect(result[0].totalUnitsSold).toBe(250);
      expect(mockRepository.getTopSellingProducts).toHaveBeenCalledWith({ limit: 2 });
    });
  });

  describe('getProfitability (Cuál es mi utilidad)', () => {
    it('debe calcular correctamente los ingresos, gastos, utilidad bruta y margen porcentual', async () => {
      const mockProfitability = {
        totalIncome: 10000.00,
        totalExpense: 3500.00,
        grossProfit: 6500.00,
        profitMarginPct: 65.00,
        totalOrders: 15,
        averageTicket: 666.67,
      };

      mockRepository.getProfitability.mockResolvedValue(mockProfitability);

      const result = await indicatorService.getProfitability({});
      expect(result.totalIncome).toBe(10000.00);
      expect(result.totalExpense).toBe(3500.00);
      expect(result.grossProfit).toBe(6500.00);
      expect(result.profitMarginPct).toBe(65.00);
      expect(result.totalOrders).toBe(15);
    });
  });

  describe('getTopChannels', () => {
    it('debe retornar el ranking de canales de venta con su porcentaje de participación', async () => {
      const mockChannels = [
        {
          channel: 'AMAZON_MX',
          totalOrders: 50,
          totalRevenue: 25000.00,
          totalUnitsSold: 65,
          percentageShare: 50.00,
        },
        {
          channel: 'MERCADOLIBRE',
          totalOrders: 30,
          totalRevenue: 15000.00,
          totalUnitsSold: 40,
          percentageShare: 30.00,
        },
        {
          channel: 'BLIFE_SHOPIFY',
          totalOrders: 20,
          totalRevenue: 10000.00,
          totalUnitsSold: 25,
          percentageShare: 20.00,
        },
      ];

      mockRepository.getTopChannels.mockResolvedValue(mockChannels);

      const result = await indicatorService.getTopChannels({});
      expect(result).toHaveLength(3);
      expect(result[0].channel).toBe('AMAZON_MX');
      expect(result[0].percentageShare).toBe(50.00);
      expect(result.reduce((acc, c) => acc + (c.percentageShare ?? 0), 0)).toBeCloseTo(100.00);
    });
  });

  describe('getRecommendations', () => {
    it('debe retornar productos comprados frecuentemente juntos cuando hay historial cruzado', async () => {
      const mockCrossSelling = [
        {
          productId: 'p-colageno',
          productName: 'Colágeno Hidrolizado',
          category: 'Belleza',
          brand: 'B-Life',
          priceRange: { minPrice: 499, maxPrice: 499 },
          score: 12,
          reason: 'FREQUENTLY_BOUGHT_TOGETHER' as const,
        },
      ];

      mockRepository.getRecommendationsByProductId.mockResolvedValue(mockCrossSelling);
      mockRepository.getPopularRecommendations.mockResolvedValue([
        {
          productId: 'p-omega',
          productName: 'Omega 3',
          category: 'Cardiovascular',
          brand: 'B-Life',
          priceRange: { minPrice: 389, maxPrice: 649 },
          score: 8,
          reason: 'CATEGORY_POPULAR' as const,
        },
      ]);

      const result = await indicatorService.getRecommendations({
        productId: 'p-magnesio',
        limit: 2,
      });

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('p-colageno');
      expect(result[0].reason).toBe('FREQUENTLY_BOUGHT_TOGETHER');
      expect(result[1].productId).toBe('p-omega');
    });
  });
});

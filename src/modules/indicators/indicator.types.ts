export interface TopProductItem {
  productId: string;
  productName: string;
  category: string;
  brand: string;
  totalUnitsSold: number;
  totalRevenue: number;
  topVariantSku?: string;
}

export interface TopProductsFilterDto {
  startDate?: string;
  endDate?: string;
  channel?: string;
  limit?: number;
}

export interface ProfitabilitySummary {
  totalIncome: number; // Cuánto gana la empresa (Ingresos por ventas)
  totalExpense: number; // Cuánto gasta la empresa (Costos de mercancía vendida)
  grossProfit: number; // Utilidad bruta (Ingresos - Gastos)
  profitMarginPct: number; // Margen de ganancia porcentual ((Utilidad / Ingresos) * 100)
  totalOrders: number; // Total de transacciones procesadas
  averageTicket: number; // Ticket promedio de compra
  periodBreakdown?: {
    period: string;
    income: number;
    expense: number;
    profit: number;
    marginPct: number;
  }[];
}

export interface ProfitabilityFilterDto {
  startDate?: string;
  endDate?: string;
  channel?: string;
  groupBy?: "total" | "daily" | "monthly";
}

export interface ChannelPerformanceItem {
  channel: string;
  totalOrders: number;
  totalRevenue: number;
  totalUnitsSold: number;
  percentageShare?: number;
}

export interface TopChannelsFilterDto {
  startDate?: string;
  endDate?: string;
}

export interface RecommendedProductItem {
  productId: string;
  productName: string;
  category: string;
  brand: string;
  priceRange: {
    minPrice: number;
    maxPrice: number;
  };
  score: number;
  reason:
    | "FREQUENTLY_BOUGHT_TOGETHER"
    | "CATEGORY_POPULAR"
    | "GLOBAL_TOP_SELLER";
  recommendedVariant?: {
    sku: string;
    variantName: string;
    price: number;
    stock: number;
  };
}

export interface RecommendationsFilterDto {
  productId?: string;
  category?: string;
  limit?: number;
}

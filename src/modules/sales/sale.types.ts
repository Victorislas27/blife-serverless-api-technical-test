export type SalesChannel = 
  | 'AMAZON_MX'
  | 'MERCADOLIBRE'
  | 'BLIFE_SHOPIFY'
  | 'TIENDA_FISICA'
  | 'LIVERPOOL'
  | 'WHATSAPP'
  | string;

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotalAmount: number;
  subtotalCost: number;
  productName?: string;
  variantName?: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  channel: SalesChannel;
  customerName: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  totalCost: number;
  saleDate: string;
  createdAt: string;
  items?: SaleItem[];
}

export interface CreateSaleItemDto {
  sku: string;
  quantity: number;
}

export interface CreateSaleDto {
  channel: SalesChannel;
  customerName: string;
  items: CreateSaleItemDto[];
  saleDate?: string;
  idempotencyKey?: string;
}

export interface SaleFilterDto {
  channel?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

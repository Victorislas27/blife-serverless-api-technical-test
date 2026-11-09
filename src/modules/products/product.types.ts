export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  variantName: string;
  price: number;
  cost: number;
  stock: number;
  attributes: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
  variants?: ProductVariant[];
}

export interface CreateVariantDto {
  sku: string;
  variantName: string;
  price: number;
  cost: number;
  stock: number;
  attributes?: Record<string, any>;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  category: string;
  brand?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  variants: CreateVariantDto[];
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  variants?: (CreateVariantDto & { id?: string })[];
}

export interface ProductFilterDto {
  category?: string;
  search?: string;
  brand?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

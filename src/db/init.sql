-- ==============================================================================
-- Script de Inicialización de Base de Datos - B-Life Store
-- Motor: PostgreSQL 16
-- Descripción: Creación de tablas, restricciones de integridad referencial,
--              claves únicas e índices B-Tree de alto rendimiento.
-- ==============================================================================

-- Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Tabla: products
-- Almacena la información general del producto padre.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL DEFAULT 'B-Life',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. Tabla: product_variants
-- Soporta N cantidad de variantes por producto. Cada una con SKU único.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    variant_name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. Secuencia y Tabla: sales
-- Registra las órdenes de venta realizadas por canal de distribución.
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(255) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_sales_idempotency_key ON sales(idempotency_key);

-- ------------------------------------------------------------------------------
-- 4. Tabla: sale_items
-- Detalle de productos y variantes vendidos en cada transacción.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    sku VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
    subtotal_amount NUMERIC(12, 2) NOT NULL CHECK (subtotal_amount >= 0),
    subtotal_cost NUMERIC(12, 2) NOT NULL CHECK (subtotal_cost >= 0)
);

-- ==============================================================================
-- Índices B-Tree de Rendimiento
-- Optimizados para búsquedas por SKU, filtros de catálogo y cálculo de KPIs
-- ==============================================================================

-- Búsqueda O(1) de variante por código SKU
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_sku 
    ON product_variants(sku);

-- Recuperación inmediata de todas las variantes de un producto
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id 
    ON product_variants(product_id);

-- Filtro compuesto para catálogo activo por categoría
CREATE INDEX IF NOT EXISTS idx_products_category_status 
    ON products(category, status);

-- Cálculo optimizado de indicadores de venta por canal y rango de fechas
CREATE INDEX IF NOT EXISTS idx_sales_channel_date 
    ON sales(channel, sale_date);

-- Filtro de fecha para cálculo de utilidad y períodos contables
CREATE INDEX IF NOT EXISTS idx_sales_date 
    ON sales(sale_date);

-- Relación rápida de items por orden de venta
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
    ON sale_items(sale_id);

-- Agregación acelerada para Top Productos Más Vendidos y Productos Comprados Juntos
CREATE INDEX IF NOT EXISTS idx_sale_items_product_variant 
    ON sale_items(product_id, variant_id);

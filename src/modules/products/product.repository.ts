import { query, transaction } from '../../config/database';
import { Product, ProductVariant, CreateProductDto, UpdateProductDto, ProductFilterDto } from './product.types';
import { randomUUID as uuidv4 } from 'crypto';

const mapVariantRow = (row: any): ProductVariant => ({
  id: row.id,
  productId: row.product_id,
  sku: row.sku,
  variantName: row.variant_name,
  price: parseFloat(row.price),
  cost: parseFloat(row.cost),
  stock: parseInt(row.stock, 10),
  attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapProductRow = (row: any, variants: ProductVariant[] = []): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category,
  brand: row.brand,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  variants,
});

export class ProductRepository {
  async skuExists(sku: string, excludeVariantId?: string): Promise<boolean> {
    let sql = 'SELECT 1 FROM product_variants WHERE UPPER(sku) = UPPER($1)';
    const params: any[] = [sku];

    if (excludeVariantId) {
      sql += ' AND id != $2';
      params.push(excludeVariantId);
    }

    const res = await query(sql, params);
    return res.rows.length > 0;
  }


  async create(data: CreateProductDto): Promise<Product> {
    return await transaction(async (client) => {
      const productId = uuidv4();
      const productRes = await client.query(
        `INSERT INTO products (id, name, description, category, brand, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          productId,
          data.name,
          data.description || '',
          data.category,
          data.brand || 'B-Life',
          data.status || 'ACTIVE',
        ]
      );

      const variants: ProductVariant[] = [];
      for (const v of data.variants) {
        const variantId = uuidv4();
        const variantRes = await client.query(
          `INSERT INTO product_variants (id, product_id, sku, variant_name, price, cost, stock, attributes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            variantId,
            productId,
            v.sku.toUpperCase().trim(),
            v.variantName,
            v.price,
            v.cost,
            v.stock,
            JSON.stringify(v.attributes || {}),
          ]
        );
        variants.push(mapVariantRow(variantRes.rows[0]));
      }

      return mapProductRow(productRes.rows[0], variants);
    });
  }

  async findById(id: string): Promise<Product | null> {
    const productRes = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (productRes.rows.length === 0) {
      return null;
    }

    const variantsRes = await query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY price ASC',
      [id]
    );

    const variants = variantsRes.rows.map(mapVariantRow);
    return mapProductRow(productRes.rows[0], variants);
  }

  async findBySku(sku: string): Promise<{ product: Product; variant: ProductVariant } | null> {
    const res = await query(
      `SELECT v.*, p.name AS product_name, p.description AS product_description,
              p.category AS product_category, p.brand AS product_brand, p.status AS product_status
       FROM product_variants v
       INNER JOIN products p ON v.product_id = p.id
       WHERE UPPER(v.sku) = UPPER($1)`,
      [sku.trim()]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const variant = mapVariantRow(row);
    const product: Product = {
      id: row.product_id,
      name: row.product_name,
      description: row.product_description,
      category: row.product_category,
      brand: row.product_brand,
      status: row.product_status,
      variants: [variant],
    };

    return { product, variant };
  }

  async findAll(filters: ProductFilterDto): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.category) {
      conditions.push(`p.category = $${paramIndex++}`);
      params.push(filters.category);
    }

    if (filters.brand) {
      conditions.push(`p.brand = $${paramIndex++}`);
      params.push(filters.brand);
    }

    if (filters.status) {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(filters.status);
    } else {
      conditions.push(`p.status != 'ARCHIVED'`);
    }

    if (filters.search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await query(
      `SELECT COUNT(DISTINCT p.id) as total FROM products p ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    const listParams = [...params, limit, offset];
    const listRes = await query(
      `SELECT p.* 
       FROM products p 
       ${whereClause} 
       ORDER BY p.created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      listParams
    );

    if (listRes.rows.length === 0) {
      return { products: [], total, page, limit };
    }

    const productIds = listRes.rows.map((r) => r.id);
    const variantsRes = await query(
      `SELECT * FROM product_variants WHERE product_id = ANY($1::uuid[]) ORDER BY price ASC`,
      [productIds]
    );

    const variantsByProduct = new Map<string, ProductVariant[]>();
    for (const vRow of variantsRes.rows) {
      const v = mapVariantRow(vRow);
      if (!variantsByProduct.has(v.productId)) {
        variantsByProduct.set(v.productId, []);
      }
      variantsByProduct.get(v.productId)!.push(v);
    }

    const products = listRes.rows.map((pRow) =>
      mapProductRow(pRow, variantsByProduct.get(pRow.id) || [])
    );

    return { products, total, page, limit };
  }

  async update(id: string, data: UpdateProductDto): Promise<Product | null> {
    return await transaction(async (client) => {
      const existing = await client.query('SELECT * FROM products WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return null;
      }

      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let idx = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${idx++}`);
        updateParams.push(data.name);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${idx++}`);
        updateParams.push(data.description);
      }
      if (data.category !== undefined) {
        updateFields.push(`category = $${idx++}`);
        updateParams.push(data.category);
      }
      if (data.brand !== undefined) {
        updateFields.push(`brand = $${idx++}`);
        updateParams.push(data.brand);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${idx++}`);
        updateParams.push(data.status);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateParams.push(id);
        await client.query(
          `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${idx}`,
          updateParams
        );
      }

      if (data.variants && data.variants.length > 0) {
        for (const v of data.variants) {
          if (v.id) {
            await client.query(
              `UPDATE product_variants 
               SET sku = $1, variant_name = $2, price = $3, cost = $4, stock = $5, 
                   attributes = $6, updated_at = CURRENT_TIMESTAMP
               WHERE id = $7 AND product_id = $8`,
              [
                v.sku.toUpperCase().trim(),
                v.variantName,
                v.price,
                v.cost,
                v.stock,
                JSON.stringify(v.attributes || {}),
                v.id,
                id,
              ]
            );
          } else {
            await client.query(
              `INSERT INTO product_variants (id, product_id, sku, variant_name, price, cost, stock, attributes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                uuidv4(),
                id,
                v.sku.toUpperCase().trim(),
                v.variantName,
                v.price,
                v.cost,
                v.stock,
                JSON.stringify(v.attributes || {}),
              ]
            );
          }
        }
      }

      const updatedProduct = await client.query('SELECT * FROM products WHERE id = $1', [id]);
      const updatedVariants = await client.query(
        'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY price ASC',
        [id]
      );

      return mapProductRow(
        updatedProduct.rows[0],
        updatedVariants.rows.map(mapVariantRow)
      );
    });
  }

  async delete(id: string): Promise<boolean> {
    const res = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    return res.rows.length > 0;
  }
}

import { query, transaction } from '../../config/database';
import { Sale, SaleItem, CreateSaleDto, SaleFilterDto } from './sale.types';
import { BadRequestError, NotFoundError } from '../../common/errors';
import { randomUUID as uuidv4 } from 'crypto';

const mapSaleRow = (row: any, items: SaleItem[] = []): Sale => ({
  id: row.id,
  saleNumber: row.sale_number,
  channel: row.channel,
  customerName: row.customer_name,
  status: row.status,
  totalAmount: parseFloat(row.total_amount),
  totalCost: parseFloat(row.total_cost),
  saleDate: row.sale_date,
  createdAt: row.created_at,
  items,
});

const mapSaleItemRow = (row: any): SaleItem => ({
  id: row.id,
  saleId: row.sale_id,
  productId: row.product_id,
  variantId: row.variant_id,
  sku: row.sku,
  quantity: parseInt(row.quantity, 10),
  unitPrice: parseFloat(row.unit_price),
  unitCost: parseFloat(row.unit_cost),
  subtotalAmount: parseFloat(row.subtotal_amount),
  subtotalCost: parseFloat(row.subtotal_cost),
  productName: row.product_name,
  variantName: row.variant_name,
});

export class SaleRepository {
  private async generateSaleNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const countRes = await query(
      `SELECT COUNT(*) as count FROM sales WHERE sale_number LIKE $1`,
      [`VTA-${year}-%`]
    );
    const count = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
    return `VTA-${year}-${count.toString().padStart(4, '0')}`;
  }

  async create(data: CreateSaleDto): Promise<Sale> {
    return await transaction(async (client) => {
      const saleId = uuidv4();
      const saleNumber = await this.generateSaleNumber();
      const saleDate = data.saleDate ? new Date(data.saleDate) : new Date();

      let totalAmount = 0;
      let totalCost = 0;
      const saleItemsToInsert: any[] = [];

      for (const item of data.items) {
        const normalizedSku = item.sku.trim().toUpperCase();
        const variantRes = await client.query(
          `SELECT v.*, p.name AS product_name 
           FROM product_variants v
           INNER JOIN products p ON v.product_id = p.id
           WHERE UPPER(v.sku) = UPPER($1) 
           FOR UPDATE`,
          [normalizedSku]
        );

        if (variantRes.rows.length === 0) {
          throw new NotFoundError(`No existe ninguna variante con el SKU "${normalizedSku}".`);
        }

        const variant = variantRes.rows[0];
        const currentStock = parseInt(variant.stock, 10);
        const requestedQty = item.quantity;

        if (currentStock < requestedQty) {
          throw new BadRequestError(
            `Inventario insuficiente para el SKU "${normalizedSku}". Stock disponible: ${currentStock}, Solicitado: ${requestedQty}.`
          );
        }

        await client.query(
          `UPDATE product_variants 
           SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [requestedQty, variant.id]
        );

        const unitPrice = parseFloat(variant.price);
        const unitCost = parseFloat(variant.cost);
        const subtotalAmount = requestedQty * unitPrice;
        const subtotalCost = requestedQty * unitCost;

        totalAmount += subtotalAmount;
        totalCost += subtotalCost;

        saleItemsToInsert.push({
          id: uuidv4(),
          saleId,
          productId: variant.product_id,
          variantId: variant.id,
          sku: normalizedSku,
          quantity: requestedQty,
          unitPrice,
          unitCost,
          subtotalAmount,
          subtotalCost,
          productName: variant.product_name,
          variantName: variant.variant_name,
        });
      }

      const saleRes = await client.query(
        `INSERT INTO sales (id, sale_number, channel, customer_name, status, total_amount, total_cost, sale_date)
         VALUES ($1, $2, $3, $4, 'COMPLETED', $5, $6, $7)
         RETURNING *`,
        [
          saleId,
          saleNumber,
          data.channel.trim().toUpperCase(),
          data.customerName.trim(),
          totalAmount,
          totalCost,
          saleDate,
        ]
      );

      const insertedItems: SaleItem[] = [];
      for (const item of saleItemsToInsert) {
        const itemRes = await client.query(
          `INSERT INTO sale_items (id, sale_id, product_id, variant_id, sku, quantity, unit_price, unit_cost, subtotal_amount, subtotal_cost)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            item.id,
            item.saleId,
            item.productId,
            item.variantId,
            item.sku,
            item.quantity,
            item.unitPrice,
            item.unitCost,
            item.subtotalAmount,
            item.subtotalCost,
          ]
        );
        insertedItems.push({
          ...mapSaleItemRow(itemRes.rows[0]),
          productName: item.productName,
          variantName: item.variantName,
        });
      }

      return mapSaleRow(saleRes.rows[0], insertedItems);
    });
  }

  async findById(id: string): Promise<Sale | null> {
    const saleRes = await query('SELECT * FROM sales WHERE id = $1', [id]);
    if (saleRes.rows.length === 0) {
      return null;
    }

    const itemsRes = await query(
      `SELECT si.*, p.name AS product_name, v.variant_name
       FROM sale_items si
       INNER JOIN products p ON si.product_id = p.id
       INNER JOIN product_variants v ON si.variant_id = v.id
       WHERE si.sale_id = $1
       ORDER BY si.subtotal_amount DESC`,
      [id]
    );

    const items = itemsRes.rows.map(mapSaleItemRow);
    return mapSaleRow(saleRes.rows[0], items);
  }

  async findAll(filters: SaleFilterDto): Promise<{ sales: Sale[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.channel) {
      conditions.push(`s.channel = $${paramIndex++}`);
      params.push(filters.channel.toUpperCase());
    }

    if (filters.status) {
      conditions.push(`s.status = $${paramIndex++}`);
      params.push(filters.status.toUpperCase());
    }

    if (filters.startDate) {
      conditions.push(`s.sale_date >= $${paramIndex++}`);
      params.push(new Date(filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(`s.sale_date <= $${paramIndex++}`);
      params.push(new Date(filters.endDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) as total FROM sales s ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const listParams = [...params, limit, offset];
    const listRes = await query(
      `SELECT s.* 
       FROM sales s 
       ${whereClause} 
       ORDER BY s.sale_date DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      listParams
    );

    const sales = listRes.rows.map((row) => mapSaleRow(row));
    return { sales, total, page, limit };
  }
}

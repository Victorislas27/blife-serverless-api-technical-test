import { query } from '../../config/database';
import {
  TopProductItem,
  TopProductsFilterDto,
  ProfitabilitySummary,
  ProfitabilityFilterDto,
  ChannelPerformanceItem,
  TopChannelsFilterDto,
  RecommendedProductItem,
} from './indicator.types';

export class IndicatorRepository {
  async getTopSellingProducts(filters: TopProductsFilterDto): Promise<TopProductItem[]> {
    const limit = Math.max(1, Math.min(50, filters.limit || 5));
    const conditions: string[] = ["s.status = 'COMPLETED'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.channel) {
      conditions.push(`s.channel = $${paramIndex++}`);
      params.push(filters.channel.toUpperCase());
    }

    if (filters.startDate) {
      conditions.push(`s.sale_date >= $${paramIndex++}`);
      params.push(new Date(filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(`s.sale_date <= $${paramIndex++}`);
      params.push(new Date(filters.endDate));
    }

    const whereClause = conditions.join(' AND ');
    params.push(limit);

    const sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.brand,
        SUM(si.quantity)::integer AS total_units_sold,
        SUM(si.subtotal_amount)::numeric AS total_revenue
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id
      INNER JOIN products p ON si.product_id = p.id
      WHERE ${whereClause}
      GROUP BY p.id, p.name, p.category, p.brand
      ORDER BY total_units_sold DESC, total_revenue DESC
      LIMIT $${paramIndex}
    `;

    const res = await query(sql, params);
    return res.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      category: row.category,
      brand: row.brand,
      totalUnitsSold: parseInt(row.total_units_sold, 10),
      totalRevenue: parseFloat(row.total_revenue),
    }));
  }

  async getProfitability(filters: ProfitabilityFilterDto): Promise<ProfitabilitySummary> {
    const conditions: string[] = ["status = 'COMPLETED'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.channel) {
      conditions.push(`channel = $${paramIndex++}`);
      params.push(filters.channel.toUpperCase());
    }

    if (filters.startDate) {
      conditions.push(`sale_date >= $${paramIndex++}`);
      params.push(new Date(filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(`sale_date <= $${paramIndex++}`);
      params.push(new Date(filters.endDate));
    }

    const whereClause = conditions.join(' AND ');

    const summarySql = `
      SELECT 
        COALESCE(SUM(total_amount), 0)::numeric AS total_income,
        COALESCE(SUM(total_cost), 0)::numeric AS total_expense,
        COUNT(*)::integer AS total_orders,
        COALESCE(AVG(total_amount), 0)::numeric AS avg_ticket
      FROM sales
      WHERE ${whereClause}
    `;

    const summaryRes = await query(summarySql, params);
    const row = summaryRes.rows[0];

    const totalIncome = parseFloat(row.total_income || '0');
    const totalExpense = parseFloat(row.total_expense || '0');
    const grossProfit = totalIncome - totalExpense;
    const profitMarginPct = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;
    const totalOrders = parseInt(row.total_orders || '0', 10);
    const averageTicket = parseFloat(row.avg_ticket || '0');

    let periodBreakdown: any[] | undefined = undefined;

    if (filters.groupBy === 'daily' || filters.groupBy === 'monthly') {
      const dateFormat = filters.groupBy === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM';
      const breakdownSql = `
        SELECT 
          TO_CHAR(sale_date, '${dateFormat}') AS period,
          SUM(total_amount)::numeric AS income,
          SUM(total_cost)::numeric AS expense
        FROM sales
        WHERE ${whereClause}
        GROUP BY period
        ORDER BY period ASC
      `;
      const breakdownRes = await query(breakdownSql, params);
      periodBreakdown = breakdownRes.rows.map((bRow) => {
        const inc = parseFloat(bRow.income);
        const exp = parseFloat(bRow.expense);
        const prof = inc - exp;
        return {
          period: bRow.period,
          income: inc,
          expense: exp,
          profit: prof,
          marginPct: inc > 0 ? Number(((prof / inc) * 100).toFixed(2)) : 0,
        };
      });
    }

    return {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      profitMarginPct: Number(profitMarginPct.toFixed(2)),
      totalOrders,
      averageTicket: Number(averageTicket.toFixed(2)),
      periodBreakdown,
    };
  }

  async getTopChannels(filters: TopChannelsFilterDto): Promise<ChannelPerformanceItem[]> {
    const conditions: string[] = ["s.status = 'COMPLETED'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.startDate) {
      conditions.push(`s.sale_date >= $${paramIndex++}`);
      params.push(new Date(filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(`s.sale_date <= $${paramIndex++}`);
      params.push(new Date(filters.endDate));
    }

    const whereClause = conditions.join(' AND ');

    const globalTotalRes = await query(
      `SELECT COALESCE(SUM(total_amount), 0)::numeric AS global_total FROM sales s WHERE ${whereClause}`,
      params
    );
    const globalTotal = parseFloat(globalTotalRes.rows[0]?.global_total || '0');

    const channelsSql = `
      SELECT 
        s.channel,
        COUNT(DISTINCT s.id)::integer AS total_orders,
        SUM(s.total_amount)::numeric AS total_revenue,
        COALESCE(SUM(si.quantity), 0)::integer AS total_units_sold
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE ${whereClause}
      GROUP BY s.channel
      ORDER BY total_revenue DESC
    `;

    const channelsRes = await query(channelsSql, params);

    return channelsRes.rows.map((row) => {
      const revenue = parseFloat(row.total_revenue || '0');
      const share = globalTotal > 0 ? (revenue / globalTotal) * 100 : 0;
      return {
        channel: row.channel,
        totalOrders: parseInt(row.total_orders, 10),
        totalRevenue: Number(revenue.toFixed(2)),
        totalUnitsSold: parseInt(row.total_units_sold, 10),
        percentageShare: Number(share.toFixed(2)),
      };
    });
  }

  async getRecommendationsByProductId(productId: string, limit: number): Promise<RecommendedProductItem[]> {
    const sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.brand,
        MIN(v.price)::numeric AS min_price,
        MAX(v.price)::numeric AS max_price,
        COUNT(DISTINCT si.sale_id)::integer AS co_occurrence_count
      FROM sale_items si
      INNER JOIN products p ON si.product_id = p.id
      INNER JOIN product_variants v ON p.id = v.product_id
      WHERE si.sale_id IN (
        SELECT DISTINCT sale_id FROM sale_items WHERE product_id = $1
      )
      AND si.product_id != $1
      AND p.status = 'ACTIVE'
      GROUP BY p.id, p.name, p.category, p.brand
      ORDER BY co_occurrence_count DESC, min_price ASC
      LIMIT $2
    `;

    const res = await query(sql, [productId, limit]);
    return res.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      category: row.category,
      brand: row.brand,
      priceRange: {
        minPrice: parseFloat(row.min_price),
        maxPrice: parseFloat(row.max_price),
      },
      score: parseInt(row.co_occurrence_count, 10),
      reason: 'FREQUENTLY_BOUGHT_TOGETHER' as const,
    }));
  }

  async getPopularRecommendations(category: string | undefined, limit: number, excludeProductId?: string): Promise<RecommendedProductItem[]> {
    const conditions: string[] = ["p.status = 'ACTIVE'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`p.category = $${paramIndex++}`);
      params.push(category);
    }

    if (excludeProductId) {
      conditions.push(`p.id != $${paramIndex++}`);
      params.push(excludeProductId);
    }

    params.push(limit);

    const sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.brand,
        MIN(v.price)::numeric AS min_price,
        MAX(v.price)::numeric AS max_price,
        COALESCE(SUM(si.quantity), 0)::integer AS popularity_score
      FROM products p
      INNER JOIN product_variants v ON p.id = v.product_id
      LEFT JOIN sale_items si ON p.id = si.product_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id, p.name, p.category, p.brand
      ORDER BY popularity_score DESC, min_price ASC
      LIMIT $${paramIndex}
    `;

    const res = await query(sql, params);
    return res.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      category: row.category,
      brand: row.brand,
      priceRange: {
        minPrice: parseFloat(row.min_price),
        maxPrice: parseFloat(row.max_price),
      },
      score: parseInt(row.popularity_score, 10),
      reason: category ? ('CATEGORY_POPULAR' as const) : ('GLOBAL_TOP_SELLER' as const),
    }));
  }
}

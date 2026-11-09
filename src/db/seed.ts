import { transaction, closePool, testConnection } from '../config/database';
import { runMigrations } from './migrate';
import { v4 as uuidv4 } from 'uuid';

/**
 * Semillero oficial de datos para demostración B-Life.
 * Inserta productos icónicos con múltiples variantes (SKU único) y órdenes de venta multicanal.
 */
export const seedDatabase = async (): Promise<void> => {
  console.log('[Seed] Verificando conexión a base de datos...');
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('[Seed Error] No hay conexión a PostgreSQL. Inicia el contenedor con: docker compose up -d');
    throw new Error('Database connection failed');
  }

  // Asegurar que las tablas existan antes de poblar
  await runMigrations();

  console.log('[Seed] Poblando catálogo y ventas de B-Life...');

  await transaction(async (client) => {
    // Limpieza previa idempotente
    await client.query('DELETE FROM sale_items');
    await client.query('DELETE FROM sales');
    await client.query('DELETE FROM product_variants');
    await client.query('DELETE FROM products');

    // --------------------------------------------------------------------------
    // 1. Catálogo de Productos B-Life
    // --------------------------------------------------------------------------
    const prodMagId = uuidv4();
    const prodColId = uuidv4();
    const prodOmgId = uuidv4();
    const prodMenId = uuidv4();
    const prodWomId = uuidv4();

    await client.query(`
      INSERT INTO products (id, name, description, category, brand, status)
      VALUES 
        ($1, 'Citrato de Magnesio Puro', 'Suplemento de alta biodisponibilidad para relajación muscular y metabolismo energético.', 'Minerales', 'B-Life', 'ACTIVE'),
        ($2, 'Colágeno Hidrolizado + Ácido Hialurónico', 'Fórmula avanzada para elasticidad de la piel, articulaciones y fortalecimiento capilar.', 'Belleza y Cuidado', 'B-Life', 'ACTIVE'),
        ($3, 'Omega 3 Ultra Puro EPA/DHA', 'Ácidos grasos esenciales destilados molecularmente para la salud cardiovascular y cerebral.', 'Cardiovascular', 'B-Life', 'ACTIVE'),
        ($4, 'Multivitamínico Daily Performance Men', 'Complejo multivitamínico con zinc y minerales optimizado para el rendimiento masculino.', 'Vitaminas', 'B-Life', 'ACTIVE'),
        ($5, 'Multivitamínico Daily Glow Women', 'Complejo multivitamínico con biotina, colágeno y antioxidantes para la vitalidad femenina.', 'Vitaminas', 'B-Life', 'ACTIVE');
    `, [prodMagId, prodColId, prodOmgId, prodMenId, prodWomId]);

    // --------------------------------------------------------------------------
    // 2. Variantes por Producto (Cada una con SKU único)
    // --------------------------------------------------------------------------
    const varMag60 = uuidv4();
    const varMag180 = uuidv4();
    const varMagPwd = uuidv4();

    const varColBerry = uuidv4();
    const varColCitrus = uuidv4();

    const varOmg90 = uuidv4();
    const varOmg180 = uuidv4();

    const varVitMen = uuidv4();
    const varVitWom = uuidv4();

    await client.query(`
      INSERT INTO product_variants (id, product_id, sku, variant_name, price, cost, stock, attributes)
      VALUES 
        ($1, $2, 'BL-MAG-60CAP', 'Frasco 60 Cápsulas (500mg)', 349.00, 120.00, 120, '{"formato": "capsulas", "conteo": 60}'::jsonb),
        ($3, $2, 'BL-MAG-180CAP', 'Frasco 180 Cápsulas (Ahorro Familiar)', 699.00, 230.00, 75, '{"formato": "capsulas", "conteo": 180}'::jsonb),
        ($4, $2, 'BL-MAG-PWD-300G', 'Polvo Soluble 300g Sabor Naranja', 399.00, 135.00, 60, '{"formato": "polvo", "sabor": "naranja", "peso_g": 300}'::jsonb),

        ($5, $6, 'BL-COL-BERRY-500G', 'Polvo 500g Frutos Rojos', 499.00, 170.00, 150, '{"formato": "polvo", "sabor": "frutos_rojos", "peso_g": 500}'::jsonb),
        ($7, $6, 'BL-COL-CITRUS-500G', 'Polvo 500g Cítricos Naturales', 499.00, 170.00, 90, '{"formato": "polvo", "sabor": "citricos", "peso_g": 500}'::jsonb),

        ($8, $9, 'BL-OMG-90CAP', 'Frasco 90 Cápsulas Blandas', 389.00, 130.00, 110, '{"formato": "softgels", "conteo": 90}'::jsonb),
        ($10, $9, 'BL-OMG-180CAP', 'Frasco 180 Cápsulas Blandas Doble Concentración', 649.00, 210.00, 50, '{"formato": "softgels", "conteo": 180}'::jsonb),

        ($11, $12, 'BL-VIT-MEN-90CAP', 'Frasco 90 Cápsulas Multivitamínico Hombre', 329.00, 110.00, 85, '{"formato": "capsulas", "conteo": 90, "genero": "hombre"}'::jsonb),
        ($13, $14, 'BL-VIT-WOM-90CAP', 'Frasco 90 Cápsulas Multivitamínico Mujer', 329.00, 110.00, 95, '{"formato": "capsulas", "conteo": 90, "genero": "mujer"}'::jsonb);
    `, [
      varMag60, prodMagId,
      varMag180,
      varMagPwd,
      varColBerry, prodColId,
      varColCitrus,
      varOmg90, prodOmgId,
      varOmg180,
      varVitMen, prodMenId,
      varVitWom, prodWomId
    ]);

    // --------------------------------------------------------------------------
    // 3. Ventas Históricas Multicanal y Cross-Selling para KPIs
    // --------------------------------------------------------------------------
    // Venta 1: Amazon MX (Magnesio + Colágeno comprados juntos)
    const sale1Id = uuidv4();
    await client.query(`
      INSERT INTO sales (id, sale_number, channel, customer_name, status, total_amount, total_cost, sale_date)
      VALUES ($1, 'VTA-2026-001', 'AMAZON_MX', 'Carlos Mendoza', 'COMPLETED', 848.00, 290.00, NOW() - INTERVAL '5 days');
    `, [sale1Id]);

    await client.query(`
      INSERT INTO sale_items (id, sale_id, product_id, variant_id, sku, quantity, unit_price, unit_cost, subtotal_amount, subtotal_cost)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, 'BL-MAG-60CAP', 1, 349.00, 120.00, 349.00, 120.00),
        (gen_random_uuid(), $1, $4, $5, 'BL-COL-BERRY-500G', 1, 499.00, 170.00, 499.00, 170.00);
    `, [sale1Id, prodMagId, varMag60, prodColId, varColBerry]);

    // Venta 2: B-Life Shopify Store (Colágeno + Multivitamínico Mujer)
    const sale2Id = uuidv4();
    await client.query(`
      INSERT INTO sales (id, sale_number, channel, customer_name, status, total_amount, total_cost, sale_date)
      VALUES ($1, 'VTA-2026-002', 'BLIFE_SHOPIFY', 'Mariana Gómez', 'COMPLETED', 828.00, 280.00, NOW() - INTERVAL '4 days');
    `, [sale2Id]);

    await client.query(`
      INSERT INTO sale_items (id, sale_id, product_id, variant_id, sku, quantity, unit_price, unit_cost, subtotal_amount, subtotal_cost)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, 'BL-COL-BERRY-500G', 1, 499.00, 170.00, 499.00, 170.00),
        (gen_random_uuid(), $1, $4, $5, 'BL-VIT-WOM-90CAP', 1, 329.00, 110.00, 329.00, 110.00);
    `, [sale2Id, prodColId, varColBerry, prodWomId, varVitWom]);

    // Venta 3: MercadoLibre (Citrato Magnesio 180 caps x 2 unidades)
    const sale3Id = uuidv4();
    await client.query(`
      INSERT INTO sales (id, sale_number, channel, customer_name, status, total_amount, total_cost, sale_date)
      VALUES ($1, 'VTA-2026-003', 'MERCADOLIBRE', 'Roberto Castillo', 'COMPLETED', 1398.00, 460.00, NOW() - INTERVAL '3 days');
    `, [sale3Id]);

    await client.query(`
      INSERT INTO sale_items (id, sale_id, product_id, variant_id, sku, quantity, unit_price, unit_cost, subtotal_amount, subtotal_cost)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, 'BL-MAG-180CAP', 2, 699.00, 230.00, 1398.00, 460.00);
    `, [sale3Id, prodMagId, varMag180]);

    // Venta 4: Tienda Física B-Life (Omega 3 + Citrato Magnesio)
    const sale4Id = uuidv4();
    await client.query(`
      INSERT INTO sales (id, sale_number, channel, customer_name, status, total_amount, total_cost, sale_date)
      VALUES ($1, 'VTA-2026-004', 'TIENDA_FISICA', 'Patricia Alarcón', 'COMPLETED', 738.00, 250.00, NOW() - INTERVAL '2 days');
    `, [sale4Id]);

    await client.query(`
      INSERT INTO sale_items (id, sale_id, product_id, variant_id, sku, quantity, unit_price, unit_cost, subtotal_amount, subtotal_cost)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, 'BL-OMG-90CAP', 1, 389.00, 130.00, 389.00, 130.00),
        (gen_random_uuid(), $1, $4, $5, 'BL-MAG-60CAP', 1, 349.00, 120.00, 349.00, 120.00);
    `, [sale4Id, prodOmgId, varOmg90, prodMagId, varMag60]);

    // Venta 5: Liverpool (Magnesio + Colágeno combo)
    const sale5Id = uuidv4();
    await client.query(`
      INSERT INTO sales (id, sale_number, channel, customer_name, status, total_amount, total_cost, sale_date)
      VALUES ($1, 'VTA-2026-005', 'LIVERPOOL', 'Fernanda Ruiz', 'COMPLETED', 898.00, 305.00, NOW() - INTERVAL '1 days');
    `, [sale5Id]);

    await client.query(`
      INSERT INTO sale_items (id, sale_id, product_id, variant_id, sku, quantity, unit_price, unit_cost, subtotal_amount, subtotal_cost)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, 'BL-MAG-PWD-300G', 1, 399.00, 135.00, 399.00, 135.00),
        (gen_random_uuid(), $1, $4, $5, 'BL-COL-CITRUS-500G', 1, 499.00, 170.00, 499.00, 170.00);
    `, [sale5Id, prodMagId, varMagPwd, prodColId, varColCitrus]);
  });

  console.log('[Seed Success] Base de datos poblada exitosamente con productos y ventas de B-Life.');
};

if (require.main === module) {
  seedDatabase()
    .then(() => closePool())
    .catch(async () => {
      await closePool();
      process.exit(1);
    });
}

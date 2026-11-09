import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración de la conexión a la base de datos PostgreSQL local (Docker).
 */
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgrespassword',
  database: process.env.DB_NAME || 'blife_store_db',
  max: 20, // Máximo de clientes en el pool para alto rendimiento
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

let pool: Pool | null = null;

/**
 * Obtiene o inicializa la instancia singleton del pool de conexiones PostgreSQL.
 */
export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool(dbConfig);

    pool.on('error', (err) => {
      console.error('[DB] Error inesperado en el pool de PostgreSQL:', err);
    });
  }
  return pool;
};

/**
 * Ejecuta una consulta SQL con parámetros seguros utilizando el pool de conexiones.
 *
 * @param text Sentencia SQL parametrizada
 * @param params Parámetros de la consulta
 * @returns Promesa con el resultado de la consulta
 */
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const currentPool = getPool();
  try {
    const res = await currentPool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[DB] Query ejecutada en ${duration}ms: ${text}`);
    }
    return res;
  } catch (error) {
    console.error(`[DB Error] Fallo al ejecutar query: ${text}`, error);
    throw error;
  }
};

/**
 * Obtiene un cliente dedicado del pool para operaciones manuales.
 */
export const getClient = async (): Promise<PoolClient> => {
  const currentPool = getPool();
  return await currentPool.connect();
};

/**
 * Ejecuta un bloque de operaciones dentro de una transacción ACID garantizada.
 * Si ocurre algún error, se realiza ROLLBACK automático. Si todo es exitoso, COMMIT.
 *
 * @param callback Función asíncrona que recibe el cliente de la transacción
 * @returns Resultado retornado por el callback
 */
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB Transaction Error] Rollback ejecutado debido a error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Verifica la disponibilidad y conectividad con la base de datos PostgreSQL.
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const res = await query('SELECT 1 AS connected');
    return res.rows.length > 0 && res.rows[0].connected === 1;
  } catch (error) {
    console.warn('[DB] No se pudo conectar a PostgreSQL en localhost:5432:', (error as Error).message);
    return false;
  }
};

/**
 * Cierra ordenadamente el pool de conexiones (útil en tests y shutdowns).
 */
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

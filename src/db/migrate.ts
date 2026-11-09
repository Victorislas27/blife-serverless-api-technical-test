import * as fs from 'fs';
import * as path from 'path';
import { query, closePool, testConnection } from '../config/database';

/**
 * Ejecutor de migraciones DDL para inicializar el esquema de PostgreSQL.
 */
export const runMigrations = async (): Promise<void> => {
  console.log('[Migrate] Iniciando ejecución de migraciones SQL...');

  const isConnected = await testConnection();
  if (!isConnected) {
    console.error(
      '[Migrate Error] No es posible conectar a PostgreSQL. Verifica que el contenedor de Docker esté activo con:\n' +
      '  docker compose up -d'
    );
    throw new Error('Database connection failed');
  }

  const sqlPath = path.join(__dirname, 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await query(sql);
    console.log('[Migrate Success] Esquema de base de datos e índices creados exitosamente.');
  } catch (error) {
    console.error('[Migrate Error] Error al ejecutar las sentencias SQL:', error);
    throw error;
  }
};

// Ejecución directa si se invoca desde la línea de comandos
if (require.main === module) {
  runMigrations()
    .then(() => closePool())
    .catch(async () => {
      await closePool();
      process.exit(1);
    });
}

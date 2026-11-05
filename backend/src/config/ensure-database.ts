import { Logger } from '@nestjs/common';
import { createConnection } from 'mysql2/promise';

/** Creates the configured database if it is missing, so a fresh MySQL install works out of the box. */
export async function ensureDatabase(): Promise<void> {
  const logger = new Logger('Database');
  const database = process.env.DB_DATABASE ?? 'ticket_tool';

  if (!/^\w+$/.test(database)) {
    throw new Error(`DB_DATABASE "${database}" may only contain letters, numbers and underscores.`);
  }

  try {
    const connection = await createConnection({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
    });
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.end();
    logger.log(`Database "${database}" is ready`);
  } catch (error) {
    logger.error(
      `Cannot connect to MySQL at ${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? 3306}. ` +
        'Start MySQL and check the DB_* values in backend/.env.',
    );
    throw error;
  }
}

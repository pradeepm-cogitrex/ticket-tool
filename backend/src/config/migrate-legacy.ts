import { Logger } from '@nestjs/common';
import { Connection, createConnection, RowDataPacket } from 'mysql2/promise';

/**
 * Upgrades a database from before clients existed, before TypeORM synchronises the tables.
 * Without this, synchronize would drop `categories` and `tickets.category_id` (and their data)
 * and would rebuild `tickets.ticket_no`. Every step checks first, so it is safe on every start.
 */
export async function migrateLegacySchema(): Promise<void> {
  const logger = new Logger('Migrate');
  const database = process.env.DB_DATABASE ?? 'ticket_tool';
  const conn = await createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database,
  });

  const tableExists = async (table: string) =>
    (await rows(conn, 'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [database, table])).length > 0;
  const column = async (table: string, name: string) =>
    (
      await rows(
        conn,
        `SELECT COLUMN_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS len
           FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [database, table, name],
      )
    )[0] as { type: string; len: number | null } | undefined;

  try {
    // 1. Category master is now the Module master
    if ((await tableExists('categories')) && !(await tableExists('modules'))) {
      await conn.query('RENAME TABLE `categories` TO `modules`');
      logger.log('Renamed table categories → modules');
    }

    // 2. tickets.category_id → tickets.module_id (foreign key is recreated by TypeORM)
    if ((await column('tickets', 'category_id')) && !(await column('tickets', 'module_id'))) {
      const fks = await rows(
        conn,
        `SELECT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'category_id' AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [database],
      );
      for (const fk of fks) await conn.query(`ALTER TABLE tickets DROP FOREIGN KEY \`${fk.name}\``);
      await conn.query('ALTER TABLE tickets CHANGE category_id module_id INT NULL');
      logger.log('Renamed column tickets.category_id → module_id');
    }

    // 3. Longer ticket numbers: TKT-<CLIENT>-<PRODUCT>-mm/yy/00001
    const ticketNo = await column('tickets', 'ticket_no');
    if (ticketNo && (ticketNo.len ?? 0) < 60) {
      await conn.query('ALTER TABLE tickets MODIFY ticket_no VARCHAR(60) NULL');
      logger.log('Widened tickets.ticket_no to 60 characters');
    }

    // 4. New super_admin role; the first admin becomes super admin so masters stay reachable
    const role = await column('employees', 'role');
    if (role && !role.type.includes("'super_admin'")) {
      await conn.query("ALTER TABLE employees MODIFY role ENUM('super_admin','admin','employee') NOT NULL DEFAULT 'employee'");
      logger.log('Added the super_admin role');
    }
    if (role) {
      const supers = await rows(conn, "SELECT id FROM employees WHERE role = 'super_admin' LIMIT 1", []);
      if (!supers.length) {
        const [first] = await rows(conn, "SELECT id, email FROM employees WHERE role = 'admin' ORDER BY id LIMIT 1", []);
        if (first) {
          await conn.query("UPDATE employees SET role = 'super_admin' WHERE id = ?", [first.id]);
          logger.log(`${first.email} is now a super admin`);
        }
      }
    }
  } finally {
    await conn.end();
  }
}

async function rows(conn: Connection, sql: string, params: unknown[]): Promise<RowDataPacket[]> {
  const [result] = await conn.query<RowDataPacket[]>(sql, params);
  return result;
}

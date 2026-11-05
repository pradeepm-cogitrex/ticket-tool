/**
 * Clears tickets and employees but keeps the masters (clients, products, client mappings & SLA, modules,
 * ticket types, priorities, statuses).
 * Also removes tables from older versions (agents, agent_products, teams).
 *
 *   npm run db:reset
 *
 * Then start the backend: with DB_SYNCHRONIZE=true the tables are recreated, and with
 * SEED_ON_START=true the starting employees from src/database/seed/seed.data.ts are added again.
 */
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DROP = [
  'ticket_notifications',
  'ticket_history',
  'ticket_attachments',
  'ticket_replies',
  'tickets',
  'employee_assignments',
  'employees',
  // older versions
  'employee_organizations',
  'agent_products',
  'agents',
  'teams',
];

async function main() {
  const database = process.env.DB_DATABASE || 'ticket_tool';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
  });

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of DROP) {
    await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
    console.log(`dropped ${table}`);
  }

  // older versions linked products to teams
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'default_team_id'`,
    [database],
  );
  if (cols.length) {
    const [fks] = await conn.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'default_team_id' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [database],
    );
    for (const fk of fks) await conn.query(`ALTER TABLE products DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
    await conn.query('ALTER TABLE products DROP COLUMN default_team_id');
    console.log('removed products.default_team_id');
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();

  const uploads = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
  if (fs.existsSync(uploads)) {
    fs.rmSync(uploads, { recursive: true, force: true });
    console.log(`deleted ${uploads}`);
  }
  console.log('Done. Start the backend to recreate the tables and add the starting employees.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

// Run schema.sql then all migration_*.sql files in alphabetical order.
// All files use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so this is idempotent.
// Usage: node database/migrate.js
//        (requires DB_* env vars or a local .env)

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const pool = require('../backend/src/config/database');
const fs   = require('fs');
const path = require('path');

const SQL_DIR = __dirname;

async function runFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
  console.log(`  ✓ ${path.basename(filePath)}`);
}

async function runMigrations() {
  console.log('Running Cords database migrations...\n');

  // 1. Base schema
  await runFile(path.join(SQL_DIR, 'schema.sql'));

  // 2. All migration files in alphabetical order
  const migrations = fs.readdirSync(SQL_DIR)
    .filter(f => f.startsWith('migration_') && f.endsWith('.sql'))
    .sort();

  for (const file of migrations) {
    await runFile(path.join(SQL_DIR, file));
  }

  console.log('\nAll migrations complete.');
  await pool.end();
}

runMigrations().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

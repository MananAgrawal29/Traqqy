import pg from 'pg';
const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
await pool.query('ALTER TABLE subscriptions RENAME COLUMN logo_url TO icon');
console.log('Renamed logo_url to icon');
await pool.end();

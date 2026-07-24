const { Client } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/migrate.js <path-to-sql>');
    process.exit(1);
  }

  const sqlPath = path.resolve(file);
  const sqlText = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Running migration: ${sqlPath}`);
  const client = new Client(process.env.STORAGE_DATABASE_URL_UNPOOLED);
  await client.connect();
  try {
    await client.query(sqlText);
    console.log('Migration applied successfully.');

    const check = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'players' ORDER BY column_name`
    );
    console.log(
      'players columns now:',
      check.rows.map((r) => r.column_name).join(', ')
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

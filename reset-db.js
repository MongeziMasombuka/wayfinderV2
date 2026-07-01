require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
   connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


async function reset() {
  const client = await pool.connect();
  try {
    await client.query('DROP DATABASE IF EXISTS grand_atrium;');
    console.log('✅ Database dropped');
    await client.query('CREATE DATABASE grand_atrium;');
    console.log('✅ Database created');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}
reset();
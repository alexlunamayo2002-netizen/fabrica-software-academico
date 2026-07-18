const { Pool } = require('pg');

const isLocal = ['localhost', '127.0.0.1'].includes(process.env.DB_HOST);

const client = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function connectDB() {
  try {
    const res = await client.query('SELECT NOW()');
    console.log('PostgreSQL conectado exitosamente:', res.rows[0].now);
    return client;
  } catch (error) {
    console.error('Error al conectar a PostgreSQL:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB, client };

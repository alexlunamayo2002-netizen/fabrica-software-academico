const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function connectDB() {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('PostgreSQL conectado exitosamente:', res.rows[0].now);
    return client;
  } catch (error) {
    console.error('Error al conectar a PostgreSQL:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB, client };

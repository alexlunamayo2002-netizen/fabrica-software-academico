// CA-013 · Configuración de BD — delega en la librería @fabrica/node-core.
const { createDbClient, connect } = require('@fabrica/node-core');
require('dotenv').config();

// Cliente singleton compartido por los modelos base del producto.
const client = createDbClient(process.env);

async function connectDB() {
  try {
    return await connect(client);
  } catch (error) {
    console.error('Error al conectar a PostgreSQL:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB, client };

const { client } = require('../config/database');

const Usuario = {
  findAll: async () => {
    const { rows } = await client.query('SELECT * FROM usuarios ORDER BY id');
    return rows;
  },
  findById: async (id) => {
    const { rows } = await client.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    return rows[0] || null;
  },
  findByEmail: async (email) => {
    const { rows } = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return rows[0] || null;
  },
};

module.exports = { Usuario };

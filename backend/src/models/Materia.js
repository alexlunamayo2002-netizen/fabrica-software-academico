const { client } = require('../config/database');

const Materia = {
  findAll: async () => {
    const { rows } = await client.query('SELECT * FROM materias ORDER BY id');
    return rows;
  },

  findById: async (id) => {
    const { rows } = await client.query('SELECT * FROM materias WHERE id = $1', [id]);
    return rows[0] || null;
  },

  findByCodigo: async (codigo) => {
    const { rows } = await client.query('SELECT * FROM materias WHERE codigo = $1', [codigo]);
    return rows[0] || null;
  },

  create: async ({ codigo, nombre, creditos = 3, descripcion = null }) => {
    const { rows } = await client.query(
      'INSERT INTO materias (codigo, nombre, creditos, descripcion) VALUES ($1, $2, $3, $4) RETURNING *',
      [codigo, nombre, creditos, descripcion]
    );
    return rows[0];
  },

  update: async (id, campos) => {
    const fields = [];
    const values = [];
    let i = 1;

    if (campos.codigo !== undefined)     { fields.push(`codigo = $${i++}`);      values.push(campos.codigo); }
    if (campos.nombre !== undefined)     { fields.push(`nombre = $${i++}`);      values.push(campos.nombre); }
    if (campos.creditos !== undefined)   { fields.push(`creditos = $${i++}`);    values.push(campos.creditos); }
    if (campos.descripcion !== undefined){ fields.push(`descripcion = $${i++}`); values.push(campos.descripcion); }

    if (fields.length === 0) throw new Error('No hay campos para actualizar');

    values.push(id);
    const { rows } = await client.query(
      `UPDATE materias SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  delete: async (id) => {
    const { rows } = await client.query('DELETE FROM materias WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },
};

module.exports = { Materia };

const { client } = require('@fabrica/node-core');

const Inscripcion = {
  findAll: async () => {
    const { rows } = await client.query(`
      SELECT i.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email,
             m.codigo AS materia_codigo, m.nombre AS materia_nombre, m.creditos AS materia_creditos
      FROM inscripciones i
      JOIN usuarios u ON u.id = i.estudiante_id
      JOIN materias m ON m.id = i.materia_id
      ORDER BY i.id
    `);
    return rows;
  },
  findByEstudiante: async (estudianteId) => {
    const { rows } = await client.query(`
      SELECT i.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email,
             m.codigo AS materia_codigo, m.nombre AS materia_nombre, m.creditos AS materia_creditos
      FROM inscripciones i
      JOIN usuarios u ON u.id = i.estudiante_id
      JOIN materias m ON m.id = i.materia_id
      WHERE i.estudiante_id = $1 ORDER BY i.fecha_inscripcion DESC
    `, [estudianteId]);
    return rows;
  },
  findByMateria: async (materiaId) => {
    const { rows } = await client.query(`
      SELECT i.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email,
             m.codigo AS materia_codigo, m.nombre AS materia_nombre, m.creditos AS materia_creditos
      FROM inscripciones i
      JOIN usuarios u ON u.id = i.estudiante_id
      JOIN materias m ON m.id = i.materia_id
      WHERE i.materia_id = $1 ORDER BY u.nombre
    `, [materiaId]);
    return rows;
  },
  findById: async (id) => {
    const { rows } = await client.query(`
      SELECT i.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email,
             m.codigo AS materia_codigo, m.nombre AS materia_nombre, m.creditos AS materia_creditos
      FROM inscripciones i
      JOIN usuarios u ON u.id = i.estudiante_id
      JOIN materias m ON m.id = i.materia_id
      WHERE i.id = $1
    `, [id]);
    return rows[0] || null;
  },
  exists: async (estudianteId, materiaId) => {
    const { rows } = await client.query(
      'SELECT id FROM inscripciones WHERE estudiante_id = $1 AND materia_id = $2',
      [estudianteId, materiaId]
    );
    return rows[0] || null;
  },
  create: async (estudianteId, materiaId) => {
    const { rows } = await client.query(
      'INSERT INTO inscripciones (estudiante_id, materia_id) VALUES ($1, $2) RETURNING *',
      [estudianteId, materiaId]
    );
    return rows[0];
  },
  delete: async (estudianteId, materiaId) => {
    const { rows } = await client.query(
      'DELETE FROM inscripciones WHERE estudiante_id = $1 AND materia_id = $2 RETURNING id',
      [estudianteId, materiaId]
    );
    return rows.length > 0;
  },
};

module.exports = { Inscripcion };

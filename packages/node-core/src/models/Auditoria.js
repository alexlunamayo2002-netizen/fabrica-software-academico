const { client } = require('../config/database');

const Auditoria = {
  registrar: async ({ usuarioId = null, accion, entidad = null, entidadId = null, detalles = null, ipAddress = null }) => {
    const { rows } = await client.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles, ip_address, fecha_hora)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [usuarioId, accion, entidad, entidadId, detalles, ipAddress]
    );
    return rows[0];
  },
  findAll: async (limit = 50, offset = 0) => {
    const { rows } = await client.query(
      `SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ORDER BY a.fecha_hora DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },
  findByUsuario: async (usuarioId, limit = 50) => {
    const { rows } = await client.query(
      `SELECT * FROM auditoria WHERE usuario_id = $1 ORDER BY fecha_hora DESC LIMIT $2`,
      [usuarioId, limit]
    );
    return rows;
  },
  findByAccion: async (accion, limit = 50) => {
    const { rows } = await client.query(
      `SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.accion = $1 ORDER BY a.fecha_hora DESC LIMIT $2`,
      [accion, limit]
    );
    return rows;
  },
};

module.exports = { Auditoria };

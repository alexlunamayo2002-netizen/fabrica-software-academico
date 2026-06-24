const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { client } = require('../config/database');

const resolvers = {
  Query: {
    me: (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      return context.user;
    },
  },
  Mutation: {
    registro: async (_, { nombre, email, password, rol }) => {
      // 1. Check if user exists
      const userCheck = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) throw new Error('El usuario ya existe');

      // 2. Get rol id
      const rolQuery = await client.query('SELECT id FROM roles WHERE nombre = $1', [rol]);
      if (rolQuery.rows.length === 0) throw new Error('Rol no válido');
      const rol_id = rolQuery.rows[0].id;

      // 3. Hash password & insert
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const insertResult = await client.query(
        'INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, email, hashedPassword, rol_id]
      );
      
      const user = insertResult.rows[0];
      const usuarioReturn = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: rol,
        createdAt: user.created_at.toISOString()
      };

      // 4. Generate token
      const token = jwt.sign(usuarioReturn, process.env.JWT_SECRET, { expiresIn: '1d' });

      return {
        token,
        usuario: usuarioReturn
      };
    },
    login: async (_, { email, password }) => {
      // 1. Get user & role
      const result = await client.query(`
        SELECT u.*, r.nombre as rol_nombre 
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.id 
        WHERE u.email = $1
      `, [email]);

      if (result.rows.length === 0) throw new Error('Credenciales incorrectas');

      const user = result.rows[0];

      // 2. Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error('Credenciales incorrectas');

      const usuarioReturn = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol_nombre,
        createdAt: user.created_at.toISOString()
      };

      // 3. Generate token
      const token = jwt.sign(usuarioReturn, process.env.JWT_SECRET, { expiresIn: '1d' });

      return {
        token,
        usuario: usuarioReturn
      };
    },
  },
};

module.exports = { resolvers };

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Role } = require('../models/Role');
const { Usuario } = require('../models/Usuario');

const resolvers = {
  Usuario: {
    rol: (parent) => Role.findById(parent.rol_id),
    createdAt: (parent) => parent.created_at ? new Date(parent.created_at).toISOString() : new Date().toISOString(),
    updatedAt: (parent) => parent.updated_at ? new Date(parent.updated_at).toISOString() : new Date().toISOString(),
  },
  Query: {
    me: (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      return context.user;
    },
    usuarios: () => Usuario.findAll(),
    usuario: (_, { id }) => Usuario.findById(id),
    roles: () => Role.findAll(),
  },
  Mutation: {
    registro: async (_, { nombre, email, password, rolId }) => {
      // 1. Check if user exists
      const userCheck = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) throw new Error('El usuario ya existe');

      // 2. Hash password & insert
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const insertResult = await client.query(
        'INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, email, hashedPassword, rolId]
      );
      
      const user = insertResult.rows[0];
      const usuarioReturn = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol_id: user.rol_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      // 3. Generate token
      const token = jwt.sign(usuarioReturn, process.env.JWT_SECRET, { expiresIn: '1d' });

      return {
        token,
        usuario: usuarioReturn
      };
    },
    login: async (_, { email, password }) => {
      // 1. Get user
      const result = await client.query(`SELECT * FROM usuarios WHERE email = $1`, [email]);

      if (result.rows.length === 0) throw new Error('Credenciales incorrectas');

      const user = result.rows[0];

      // 2. Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error('Credenciales incorrectas');

      const usuarioReturn = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol_id: user.rol_id,
        created_at: user.created_at,
        updated_at: user.updated_at
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

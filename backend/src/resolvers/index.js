const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Role } = require('../models/Role');
const { Usuario } = require('../models/Usuario');

const resolvers = {
  Usuario: {
    rol: (parent) => Role.findById(parent.rol_id),
    createdAt: (parent) => parent.created_at,
    updatedAt: (parent) => parent.updated_at,
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
      const existente = await Usuario.findByEmail(email);
      if (existente) {
        throw new Error('El email ya está registrado');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const usuario = await Usuario.create({
        nombre,
        email,
        password: hashedPassword,
        rol_id: rolId,
      });

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol_id: usuario.rol_id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return { token, usuario };
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

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
    usuarios: () => Usuario.findAll(),
    usuario: (_, { id }) => Usuario.findById(id),
    roles: () => Role.findAll(),
    me: () => {
      return null;
    },
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
    login: () => {
      throw new Error('No implementado aún');
    },
  },
};

module.exports = { resolvers };

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
    registro: () => {
      throw new Error('No implementado aún');
    },
    login: () => {
      throw new Error('No implementado aún');
    },
  },
};

module.exports = { resolvers };

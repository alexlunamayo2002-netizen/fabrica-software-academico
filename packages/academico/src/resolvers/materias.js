const { Materia } = require('../models/Materia');

const resolvers = {
  Materia: {
    createdAt: (p) => p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
    updatedAt: (p) => p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString(),
  },
  Query: {
    materias: () => Materia.findAll(),
    materia: (_, { id }) => Materia.findById(id),
  },
  Mutation: {
    crearMateria: async (_, { codigo, nombre, creditos, descripcion }, context) => {
      if (!context.user) throw new Error('No autenticado');
      const existente = await Materia.findByCodigo(codigo);
      if (existente) throw new Error(`Ya existe una materia con el código ${codigo}`);
      return Materia.create({ codigo, nombre, creditos, descripcion });
    },
    actualizarMateria: async (_, { id, ...campos }, context) => {
      if (!context.user) throw new Error('No autenticado');
      const existente = await Materia.findById(id);
      if (!existente) throw new Error('Materia no encontrada');
      if (campos.codigo) {
        const dup = await Materia.findByCodigo(campos.codigo);
        if (dup && dup.id !== Number(id)) throw new Error(`Ya existe una materia con el código ${campos.codigo}`);
      }
      return Materia.update(id, campos);
    },
    eliminarMateria: async (_, { id }, context) => {
      if (!context.user) throw new Error('No autenticado');
      const existente = await Materia.findById(id);
      if (!existente) throw new Error('Materia no encontrada');
      return Materia.delete(id);
    },
  },
};

module.exports = { resolvers };

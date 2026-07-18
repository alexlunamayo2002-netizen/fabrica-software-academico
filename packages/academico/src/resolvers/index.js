const { client, Usuario } = require('@fabrica/node-core');
const { Materia } = require('../models/Materia');
const { Inscripcion } = require('../models/Inscripcion');

const resolvers = {
  Materia: {
    createdAt: (parent) => parent.created_at ? new Date(parent.created_at).toISOString() : new Date().toISOString(),
    updatedAt: (parent) => parent.updated_at ? new Date(parent.updated_at).toISOString() : new Date().toISOString(),
  },
  Inscripcion: {
    fechaInscripcion: (parent) => parent.fecha_inscripcion ? new Date(parent.fecha_inscripcion).toISOString() : new Date().toISOString(),
    estudiante: (parent) => ({
      id: parent.estudiante_id,
      nombre: parent.estudiante_nombre,
      email: parent.estudiante_email,
      rol_id: parent.rol_id,
      created_at: parent.created_at,
      updated_at: parent.updated_at,
    }),
    materia: (parent) => ({
      id: parent.materia_id,
      codigo: parent.materia_codigo,
      nombre: parent.materia_nombre,
      creditos: parent.materia_creditos,
      created_at: parent.created_at,
      updated_at: parent.updated_at,
    }),
  },
  Query: {
    stats: async (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      const [usuarios, materias, inscripciones] = await Promise.all([
        client.query('SELECT COUNT(*) FROM usuarios'),
        client.query('SELECT COUNT(*) FROM materias'),
        client.query('SELECT COUNT(*) FROM inscripciones'),
      ]);
      return {
        totalUsuarios:      parseInt(usuarios.rows[0].count),
        totalMaterias:      parseInt(materias.rows[0].count),
        totalInscripciones: parseInt(inscripciones.rows[0].count),
      };
    },
    materias: () => Materia.findAll(),
    materia: (_, { id }) => Materia.findById(id),
    inscripciones: (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Inscripcion.findAll();
    },
    inscripcionesPorEstudiante: (_, { estudianteId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Inscripcion.findByEstudiante(estudianteId);
    },
    inscripcionesPorMateria: (_, { materiaId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Inscripcion.findByMateria(materiaId);
    },
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
        const duplicado = await Materia.findByCodigo(campos.codigo);
        if (duplicado && duplicado.id !== Number(id)) throw new Error(`Ya existe una materia con el código ${campos.codigo}`);
      }
      return Materia.update(id, campos);
    },
    eliminarMateria: async (_, { id }, context) => {
      if (!context.user) throw new Error('No autenticado');
      const existente = await Materia.findById(id);
      if (!existente) throw new Error('Materia no encontrada');
      return Materia.delete(id);
    },
    inscribir: async (_, { estudianteId, materiaId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      const yaInscrito = await Inscripcion.exists(estudianteId, materiaId);
      if (yaInscrito) throw new Error('El estudiante ya está inscrito en esta materia');
      const estudiante = await Usuario.findById(estudianteId);
      if (!estudiante) throw new Error('Estudiante no encontrado');
      const materia = await Materia.findById(materiaId);
      if (!materia) throw new Error('Materia no encontrada');
      const inscripcion = await Inscripcion.create(estudianteId, materiaId);
      return {
        ...inscripcion,
        estudiante_nombre: estudiante.nombre,
        estudiante_email: estudiante.email,
        materia_codigo: materia.codigo,
        materia_nombre: materia.nombre,
        materia_creditos: materia.creditos,
      };
    },
    desinscribir: async (_, { estudianteId, materiaId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      const inscripcion = await Inscripcion.exists(estudianteId, materiaId);
      if (!inscripcion) throw new Error('El estudiante no está inscrito en esta materia');
      return Inscripcion.delete(estudianteId, materiaId);
    },
  },
};

module.exports = { resolvers };

const { client, Usuario } = require('@fabrica/node-core');
const { Materia } = require('../models/Materia');
const { Inscripcion } = require('../models/Inscripcion');

const resolvers = {
  Inscripcion: {
    fechaInscripcion: (p) => p.fecha_inscripcion ? new Date(p.fecha_inscripcion).toISOString() : new Date().toISOString(),
    estudiante: (p) => ({
      id: p.estudiante_id, nombre: p.estudiante_nombre, email: p.estudiante_email,
      rol_id: p.rol_id, created_at: p.created_at, updated_at: p.updated_at,
    }),
    materia: (p) => ({
      id: p.materia_id, codigo: p.materia_codigo, nombre: p.materia_nombre,
      creditos: p.materia_creditos, created_at: p.created_at, updated_at: p.updated_at,
    }),
  },
  Query: {
    stats: async (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      const [u, m, i] = await Promise.all([
        client.query('SELECT COUNT(*) FROM usuarios'),
        client.query('SELECT COUNT(*) FROM materias'),
        client.query('SELECT COUNT(*) FROM inscripciones'),
      ]);
      return {
        totalUsuarios:      parseInt(u.rows[0].count),
        totalMaterias:      parseInt(m.rows[0].count),
        totalInscripciones: parseInt(i.rows[0].count),
      };
    },
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
    inscribir: async (_, { estudianteId, materiaId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      if (await Inscripcion.exists(estudianteId, materiaId)) throw new Error('El estudiante ya está inscrito en esta materia');
      const estudiante = await Usuario.findById(estudianteId);
      if (!estudiante) throw new Error('Estudiante no encontrado');
      const materia = await Materia.findById(materiaId);
      if (!materia) throw new Error('Materia no encontrada');
      const inscripcion = await Inscripcion.create(estudianteId, materiaId);
      return {
        ...inscripcion,
        estudiante_nombre: estudiante.nombre, estudiante_email: estudiante.email,
        materia_codigo: materia.codigo, materia_nombre: materia.nombre, materia_creditos: materia.creditos,
      };
    },
    desinscribir: async (_, { estudianteId, materiaId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      if (!await Inscripcion.exists(estudianteId, materiaId)) throw new Error('El estudiante no está inscrito en esta materia');
      return Inscripcion.delete(estudianteId, materiaId);
    },
  },
};

module.exports = { resolvers };

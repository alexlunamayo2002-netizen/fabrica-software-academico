const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { client } = require('../config/database');
const { Role } = require('../models/Role');
const { Usuario } = require('../models/Usuario');
const { Auditoria } = require('../models/Auditoria');
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
  Usuario: {
    rol: (parent) => Role.findById(parent.rol_id),
    createdAt: (parent) => parent.created_at ? new Date(parent.created_at).toISOString() : new Date().toISOString(),
    updatedAt: (parent) => parent.updated_at ? new Date(parent.updated_at).toISOString() : new Date().toISOString(),
  },
  Auditoria: {
    usuarioId: (parent) => parent.usuario_id,
    entidadId: (parent) => parent.entidad_id,
    ipAddress: (parent) => parent.ip_address,
    fechaHora: (parent) => parent.fecha_hora ? new Date(parent.fecha_hora).toISOString() : new Date().toISOString(),
    usuarioNombre: (parent) => parent.usuario_nombre || null,
    usuarioEmail: (parent) => parent.usuario_email || null,
  },
  Query: {
    me: (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      return context.user;
    },
    usuarios: () => Usuario.findAll(),
    usuario: (_, { id }) => Usuario.findById(id),
    roles: () => Role.findAll(),

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

    // Queries de materias
    materias: () => Materia.findAll(),
    materia: (_, { id }) => Materia.findById(id),

    // Queries de inscripciones
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

    // Queries de auditoría
    auditoria: async (_, { limit = 50, offset = 0 }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Auditoria.findAll(limit, offset);
    },
    auditoriaByUsuario: async (_, { usuarioId, limit = 50 }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Auditoria.findByUsuario(usuarioId, limit);
    },
    auditoriaByAccion: async (_, { accion, limit = 50 }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Auditoria.findByAccion(accion, limit);
    },
  },
  Mutation: {
    registro: async (_, { nombre, email, password, rolId }, context) => {
      // 1. Verificar si el email ya existe (usando el modelo del compañero)
      const existente = await Usuario.findByEmail(email);
      if (existente) {
        throw new Error('El email ya está registrado');
      }

      // 2. Hash password & crear usuario (usando el modelo del compañero)
      const hashedPassword = await bcrypt.hash(password, 10);
      const usuario = await Usuario.create({
        nombre,
        email,
        password: hashedPassword,
        rol_id: rolId,
      });

      // 3. Generate token
      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol_id: usuario.rol_id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 4. Registrar evento de auditoría
      const ipAddress = context.req ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida') : 'desconocida';
      await Auditoria.registrar({
        usuarioId: usuario.id,
        accion: 'REGISTRO',
        entidad: 'usuarios',
        entidadId: usuario.id,
        detalles: `Nuevo usuario registrado: ${email}`,
        ipAddress
      });

      return { token, usuario };
    },
    login: async (_, { email, password }, context) => {
      const ipAddress = context.req ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida') : 'desconocida';

      // 1. Buscar usuario por email
      const user = await Usuario.findByEmail(email);

      if (!user) {
        // Registrar intento fallido de login
        await Auditoria.registrar({
          usuarioId: null,
          accion: 'LOGIN_FALLIDO',
          entidad: 'usuarios',
          entidadId: null,
          detalles: `Intento de login fallido - email no encontrado: ${email}`,
          ipAddress
        });
        throw new Error('Credenciales incorrectas');
      }

      // 2. Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Registrar intento fallido de login
        await Auditoria.registrar({
          usuarioId: user.id,
          accion: 'LOGIN_FALLIDO',
          entidad: 'usuarios',
          entidadId: user.id,
          detalles: `Intento de login fallido - contraseña incorrecta: ${email}`,
          ipAddress
        });
        throw new Error('Credenciales incorrectas');
      }

      const usuarioReturn = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol_id: user.rol_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      // 3. Generate token
      const token = jwt.sign(usuarioReturn, process.env.JWT_SECRET, { expiresIn: '24h' });

      // 4. Registrar login exitoso
      await Auditoria.registrar({
        usuarioId: user.id,
        accion: 'LOGIN',
        entidad: 'usuarios',
        entidadId: user.id,
        detalles: `Login exitoso: ${email}`,
        ipAddress
      });

      return {
        token,
        usuario: usuarioReturn
      };
    },
    // Mutations de inscripciones
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

    // Mutations de materias
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

    logout: async (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');

      const ipAddress = context.req ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida') : 'desconocida';

      // Registrar logout
      await Auditoria.registrar({
        usuarioId: context.user.id,
        accion: 'LOGOUT',
        entidad: 'usuarios',
        entidadId: context.user.id,
        detalles: `Logout: ${context.user.email}`,
        ipAddress
      });

      return true;
    },
  },
};

module.exports = { resolvers };

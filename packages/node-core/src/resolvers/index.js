const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Role } = require('../models/Role');
const { Usuario } = require('../models/Usuario');
const { Auditoria } = require('../models/Auditoria');

const resolvers = {
  Usuario: {
    rol: (parent) => Role.findById(parent.rol_id),
    createdAt: (parent) => parent.created_at ? new Date(parent.created_at).toISOString() : new Date().toISOString(),
    updatedAt: (parent) => parent.updated_at ? new Date(parent.updated_at).toISOString() : new Date().toISOString(),
  },
  Auditoria: {
    usuarioId:    (parent) => parent.usuario_id,
    entidadId:    (parent) => parent.entidad_id,
    ipAddress:    (parent) => parent.ip_address,
    fechaHora:    (parent) => parent.fecha_hora ? new Date(parent.fecha_hora).toISOString() : new Date().toISOString(),
    usuarioNombre:(parent) => parent.usuario_nombre || null,
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
      const existente = await Usuario.findByEmail(email);
      if (existente) throw new Error('El email ya está registrado');

      const hashedPassword = await bcrypt.hash(password, 10);
      const usuario = await Usuario.create({ nombre, email, password: hashedPassword, rol_id: rolId });

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol_id: usuario.rol_id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const ipAddress = context.req
        ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida')
        : 'desconocida';

      await Auditoria.registrar({
        usuarioId: usuario.id, accion: 'REGISTRO', entidad: 'usuarios',
        entidadId: usuario.id, detalles: `Nuevo usuario registrado: ${email}`, ipAddress,
      });

      return { token, usuario };
    },

    login: async (_, { email, password }, context) => {
      const ipAddress = context.req
        ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida')
        : 'desconocida';

      const user = await Usuario.findByEmail(email);
      if (!user) {
        await Auditoria.registrar({
          usuarioId: null, accion: 'LOGIN_FALLIDO', entidad: 'usuarios', entidadId: null,
          detalles: `Intento de login fallido - email no encontrado: ${email}`, ipAddress,
        });
        throw new Error('Credenciales incorrectas');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        await Auditoria.registrar({
          usuarioId: user.id, accion: 'LOGIN_FALLIDO', entidad: 'usuarios', entidadId: user.id,
          detalles: `Intento de login fallido - contraseña incorrecta: ${email}`, ipAddress,
        });
        throw new Error('Credenciales incorrectas');
      }

      const usuarioReturn = {
        id: user.id, nombre: user.nombre, email: user.email,
        rol_id: user.rol_id, created_at: user.created_at, updated_at: user.updated_at,
      };

      const token = jwt.sign(usuarioReturn, process.env.JWT_SECRET, { expiresIn: '24h' });

      await Auditoria.registrar({
        usuarioId: user.id, accion: 'LOGIN', entidad: 'usuarios',
        entidadId: user.id, detalles: `Login exitoso: ${email}`, ipAddress,
      });

      return { token, usuario: usuarioReturn };
    },

    logout: async (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      const ipAddress = context.req
        ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida')
        : 'desconocida';
      await Auditoria.registrar({
        usuarioId: context.user.id, accion: 'LOGOUT', entidad: 'usuarios',
        entidadId: context.user.id, detalles: `Logout: ${context.user.email}`, ipAddress,
      });
      return true;
    },
  },
};

module.exports = { resolvers };

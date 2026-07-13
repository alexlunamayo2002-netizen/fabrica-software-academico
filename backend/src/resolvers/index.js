// Resolvers BASE del producto (autenticación y usuarios).
// `auditoria` se inyecta: es el módulo real de CA-012 o un no-op si está off.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getIp } = require('@fabrica/node-core');
const { Role } = require('../models/Role');
const { Usuario } = require('../models/Usuario');

function buildBaseResolvers({ auditoria }) {
  return {
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

        await auditoria.registrar({
          usuarioId: usuario.id, accion: 'REGISTRO', entidad: 'usuarios', entidadId: usuario.id,
          detalles: `Nuevo usuario registrado: ${email}`, ipAddress: getIp(context)
        });

        return { token, usuario };
      },
      login: async (_, { email, password }, context) => {
        const ipAddress = getIp(context);
        const user = await Usuario.findByEmail(email);

        if (!user) {
          await auditoria.registrar({ usuarioId: null, accion: 'LOGIN_FALLIDO', entidad: 'usuarios', entidadId: null, detalles: `Intento de login fallido - email no encontrado: ${email}`, ipAddress });
          throw new Error('Credenciales incorrectas');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          await auditoria.registrar({ usuarioId: user.id, accion: 'LOGIN_FALLIDO', entidad: 'usuarios', entidadId: user.id, detalles: `Intento de login fallido - contraseña incorrecta: ${email}`, ipAddress });
          throw new Error('Credenciales incorrectas');
        }

        const usuarioReturn = {
          id: user.id, nombre: user.nombre, email: user.email, rol_id: user.rol_id,
          created_at: user.created_at, updated_at: user.updated_at
        };

        const token = jwt.sign(usuarioReturn, process.env.JWT_SECRET, { expiresIn: '24h' });

        await auditoria.registrar({ usuarioId: user.id, accion: 'LOGIN', entidad: 'usuarios', entidadId: user.id, detalles: `Login exitoso: ${email}`, ipAddress });

        return { token, usuario: usuarioReturn };
      },
      logout: async (_, __, context) => {
        if (!context.user) throw new Error('No autenticado');
        await auditoria.registrar({ usuarioId: context.user.id, accion: 'LOGOUT', entidad: 'usuarios', entidadId: context.user.id, detalles: `Logout: ${context.user.email}`, ipAddress: getIp(context) });
        return true;
      },
    },
  };
}

module.exports = { buildBaseResolvers, Usuario };

const { client, connectDB } = require('./config/database');
const { verifyToken } = require('./middleware/auth');
const { Role } = require('./models/Role');
const { Usuario } = require('./models/Usuario');
const { Auditoria } = require('./models/Auditoria');
const { typeDefs } = require('./schema/typeDefs');
const { resolvers } = require('./resolvers/index');

module.exports = { client, connectDB, verifyToken, Role, Usuario, Auditoria, typeDefs, resolvers };

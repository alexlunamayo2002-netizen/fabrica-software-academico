const { Materia } = require('./models/Materia');
const { Inscripcion } = require('./models/Inscripcion');
const { typeDefs } = require('./schema/typeDefs');
const { resolvers } = require('./resolvers/index');

module.exports = { Materia, Inscripcion, typeDefs, resolvers };

const { Materia } = require('./models/Materia');
const { Inscripcion } = require('./models/Inscripcion');

// Sub-módulo por CA-016: Materias
const materias = {
  typeDefs:  require('./schema/materias.typeDefs').typeDefs,
  resolvers: require('./resolvers/materias').resolvers,
};

// Sub-módulo por CA-017: Inscripciones (depende de CA-016 por tipo Materia)
const inscripciones = {
  typeDefs:  require('./schema/inscripciones.typeDefs').typeDefs,
  resolvers: require('./resolvers/inscripciones').resolvers,
};

// Exports completos (ambos CAs activos)
const { typeDefs } = require('./schema/typeDefs');
const { resolvers } = require('./resolvers/index');

module.exports = { Materia, Inscripcion, typeDefs, resolvers, materias, inscripciones };

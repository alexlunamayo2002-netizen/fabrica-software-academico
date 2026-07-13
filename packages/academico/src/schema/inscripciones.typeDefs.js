// Nota: CA-017 depende de CA-016 (Inscripcion referencia Materia)
const typeDefs = `#graphql
  type Inscripcion {
    id: ID!
    estudiante: Usuario!
    materia: Materia!
    fechaInscripcion: String!
  }

  type Stats {
    totalUsuarios: Int!
    totalMaterias: Int!
    totalInscripciones: Int!
  }

  extend type Query {
    stats: Stats!
    inscripciones: [Inscripcion!]!
    inscripcionesPorEstudiante(estudianteId: ID!): [Inscripcion!]!
    inscripcionesPorMateria(materiaId: ID!): [Inscripcion!]!
  }

  extend type Mutation {
    inscribir(estudianteId: ID!, materiaId: ID!): Inscripcion!
    desinscribir(estudianteId: ID!, materiaId: ID!): Boolean!
  }
`;

module.exports = { typeDefs };

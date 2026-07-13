const typeDefs = `#graphql
  type Materia {
    id: ID!
    codigo: String!
    nombre: String!
    creditos: Int!
    descripcion: String
    createdAt: String!
    updatedAt: String!
  }

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
    materias: [Materia!]!
    materia(id: ID!): Materia
    stats: Stats!
    inscripciones: [Inscripcion!]!
    inscripcionesPorEstudiante(estudianteId: ID!): [Inscripcion!]!
    inscripcionesPorMateria(materiaId: ID!): [Inscripcion!]!
  }

  extend type Mutation {
    crearMateria(codigo: String!, nombre: String!, creditos: Int!, descripcion: String): Materia!
    actualizarMateria(id: ID!, codigo: String, nombre: String, creditos: Int, descripcion: String): Materia!
    eliminarMateria(id: ID!): Boolean!
    inscribir(estudianteId: ID!, materiaId: ID!): Inscripcion!
    desinscribir(estudianteId: ID!, materiaId: ID!): Boolean!
  }
`;

module.exports = { typeDefs };

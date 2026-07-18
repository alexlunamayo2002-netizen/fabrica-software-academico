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

  extend type Query {
    materias: [Materia!]!
    materia(id: ID!): Materia
  }

  extend type Mutation {
    crearMateria(codigo: String!, nombre: String!, creditos: Int!, descripcion: String): Materia!
    actualizarMateria(id: ID!, codigo: String, nombre: String, creditos: Int, descripcion: String): Materia!
    eliminarMateria(id: ID!): Boolean!
  }
`;

module.exports = { typeDefs };

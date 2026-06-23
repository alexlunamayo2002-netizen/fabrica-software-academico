const typeDefs = `#graphql
  enum Role {
    ADMIN
    DOCENTE
    ESTUDIANTE
  }

  type Usuario {

    id: ID!
    nombre: String!
    email: String!
    rol: Role!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    usuario: Usuario!
  }

  type Query {
    me: Usuario
  }

  type Mutation {
    registro(nombre: String!, email: String!, password: String!, rol: Role!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }
`;

module.exports = { typeDefs };

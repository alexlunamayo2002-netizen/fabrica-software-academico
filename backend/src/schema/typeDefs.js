const typeDefs = `#graphql
  type Role {
    id: ID!
    nombre: String!
  }

  type Usuario {
    id: ID!
    nombre: String!
    email: String!
    rol: Role!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    usuario: Usuario!
  }

  type Query {
    usuarios: [Usuario!]!
    usuario(id: ID!): Usuario
    roles: [Role!]!
    me: Usuario
  }

  type Mutation {
    registro(nombre: String!, email: String!, password: String!, rolId: ID!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }
`;

module.exports = { typeDefs };

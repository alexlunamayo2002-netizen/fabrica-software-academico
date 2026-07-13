// Esquema BASE del producto (commonalities siempre presentes).
// Los módulos opcionales (Auditoría, Materias, Inscripciones) se componen
// desde las librerías @fabrica/* en server.js según los feature toggles.
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
    logout: Boolean!
  }
`;

module.exports = { typeDefs };

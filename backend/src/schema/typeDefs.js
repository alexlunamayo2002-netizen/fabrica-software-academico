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

  type Auditoria {
    id: ID!
    usuarioId: Int
    accion: String!
    entidad: String
    entidadId: Int
    detalles: String
    ipAddress: String
    fechaHora: String!
    usuarioNombre: String
    usuarioEmail: String
  }

  type Materia {
    id: ID!
    codigo: String!
    nombre: String!
    creditos: Int!
    descripcion: String
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    usuarios: [Usuario!]!
    usuario(id: ID!): Usuario
    roles: [Role!]!
    me: Usuario
    auditoria(limit: Int, offset: Int): [Auditoria!]!
    auditoriaByUsuario(usuarioId: ID!, limit: Int): [Auditoria!]!
    auditoriaByAccion(accion: String!, limit: Int): [Auditoria!]!
    materias: [Materia!]!
    materia(id: ID!): Materia
  }

  type Mutation {
    registro(nombre: String!, email: String!, password: String!, rolId: ID!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    crearMateria(codigo: String!, nombre: String!, creditos: Int!, descripcion: String): Materia!
    actualizarMateria(id: ID!, codigo: String, nombre: String, creditos: Int, descripcion: String): Materia!
    eliminarMateria(id: ID!): Boolean!
  }
`;

module.exports = { typeDefs };

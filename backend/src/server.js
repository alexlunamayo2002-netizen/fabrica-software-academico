require('dotenv').config();

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

// Composición SPLE: importar Core Assets desde librerías @fabrica/*
const {
  connectDB,
  verifyToken,
  typeDefs: coreDefs,
  resolvers: coreResolvers,
} = require('@fabrica/node-core');

const {
  typeDefs: academicoDefs,
  resolvers: academicoResolvers,
} = require('@fabrica/academico');

// Merge typeDefs (Apollo acepta array de SDL strings)
const typeDefs = [coreDefs, academicoDefs];

// Merge resolvers: type resolvers + Query + Mutation
const resolvers = {
  ...coreResolvers,
  ...academicoResolvers,
  Query:    { ...coreResolvers.Query,    ...academicoResolvers.Query },
  Mutation: { ...coreResolvers.Mutation, ...academicoResolvers.Mutation },
};

async function startServer() {
  await connectDB();

  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
    context: async ({ req }) => {
      const token = req.headers.authorization || '';
      const user = verifyToken(token);
      return { token, user, req };
    },
  });

  console.log(`Servidor GraphQL listo en ${url}`);
}

startServer();

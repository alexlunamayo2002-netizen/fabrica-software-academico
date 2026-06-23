const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { typeDefs } = require('./schema/typeDefs');
const { resolvers } = require('./resolvers');
const { connectDB } = require('./config/database');
require('dotenv').config();

async function startServer() {
  await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
    context: async ({ req }) => {
      return { token: req.headers.authorization || '' };
    },
  });

  console.log(`Servidor GraphQL listo en ${url}`);
}

startServer();

require('dotenv').config();

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { connectDB, verifyToken } = require('@fabrica/node-core');

// Composición SPLE: el assembler lee factory-config.json y carga
// solo los módulos habilitados vía feature flags (HU-S2.7)
console.log('\n[SPLE] Ensamblando servidor según factory-config.json...');
const { typeDefs, resolvers } = require('./assembler');

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

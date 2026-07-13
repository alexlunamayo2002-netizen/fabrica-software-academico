// ============================================================
// COMPOSITION ROOT del producto.
// Ensambla el esquema GraphQL a partir de las librerías @fabrica/*
// según los feature toggles de factory-config.json.
// ============================================================
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const {
  verifyToken,
  createAuditoriaModule,
  noopAuditoria,
  composeModules,
  crearFeatureToggles,
} = require('@fabrica/node-core');
const { createAcademicoModule } = require('@fabrica/academico');
const { typeDefs: baseTypeDefs } = require('./schema/typeDefs');
const { buildBaseResolvers, Usuario } = require('./resolvers');
const { connectDB, client } = require('./config/database');
require('dotenv').config();

async function startServer() {
  await connectDB();

  // 1. Variabilidad: qué Core Assets están activos en este producto.
  const features = crearFeatureToggles();

  // 2. Módulo de Auditoría (CA-012) — real si está activo, no-op si no.
  const auditoriaOn = features.isEnabled('CA-012_ModeloAuditoria');
  const auditoriaModule = auditoriaOn ? createAuditoriaModule({ client }) : null;
  const auditoria = auditoriaModule ? auditoriaModule.model : noopAuditoria;

  // 3. Ensamblaje de módulos según toggles.
  const modules = [
    { typeDefs: baseTypeDefs, resolvers: buildBaseResolvers({ auditoria }) },
  ];

  if (auditoriaOn) modules.push(auditoriaModule);

  if (features.isEnabled('CA-016_ModuloMaterias')) {
    modules.push(createAcademicoModule({ client, usuarioModel: Usuario, auditoria }));
    console.log('  ✓ Módulo @fabrica/academico (CA-016/CA-017) cargado');
  }

  const { typeDefs, resolvers } = composeModules(modules);

  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
    context: async ({ req }) => {
      const user = verifyToken(req.headers.authorization || '');
      return { user, req };
    },
  });

  console.log(`Servidor GraphQL listo en ${url}`);
  console.log(`Core Assets activos: ${features.enabledAssets().length}`);
}

startServer();

// ============================================================
// COMPOSITION ROOT del producto (cascarón).
// Todo el código vive en las librerías @fabrica/*; este archivo
// solo ENSAMBLA los Core Assets activos según los feature toggles.
// ============================================================
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const {
  createDbClient, connect,
  ensureDatabase, ensureBaseTables, ensureAuditoriaTable,
  verifyToken,
  createUsuarioModel, createRoleModel, baseTypeDefs, buildBaseResolvers,
  createAuditoriaModule, noopAuditoria,
  composeModules, crearFeatureToggles,
} = require('@fabrica/node-core');
require('dotenv').config();

async function startServer() {
  const features = crearFeatureToggles();
  const client = createDbClient(process.env);

  // CA-018 · Auto-setup de BD (la database y las tablas de cada asset activo)
  const autoSetup = features.isEnabled('CA-018_SetupBD_Automatico');
  if (autoSetup) {
    console.log('🗄️  CA-018: verificando base de datos y tablas...');
    await ensureDatabase(process.env);
  }

  await connect(client);

  // Modelos base (commonalities)
  const Usuario = createUsuarioModel(client);
  const Role = createRoleModel(client);

  // CA-012 · Auditoría (real si está activa, no-op si no)
  const auditoriaOn = features.isEnabled('CA-012_ModeloAuditoria');
  const auditoriaModule = auditoriaOn ? createAuditoriaModule({ client }) : null;
  const auditoria = auditoriaModule ? auditoriaModule.model : noopAuditoria;

  if (autoSetup) {
    await ensureBaseTables(client);
    if (auditoriaOn) await ensureAuditoriaTable(client);
  }

  // Ensamblaje de módulos según toggles
  const modules = [
    { typeDefs: baseTypeDefs, resolvers: buildBaseResolvers({ Usuario, Role, auditoria, jwtSecret: process.env.JWT_SECRET }) },
  ];
  if (auditoriaOn) modules.push(auditoriaModule);

  if (features.isEnabled('CA-016_ModuloMaterias')) {
    const { createAcademicoModule, ensureMateriasTable, ensureInscripcionesTable } = require('@fabrica/academico');
    modules.push(createAcademicoModule({ client, usuarioModel: Usuario, auditoria }));
    if (autoSetup) {
      await ensureMateriasTable(client);
      if (features.isEnabled('CA-017_ModuloInscripciones')) await ensureInscripcionesTable(client);
    }
    console.log('  ✓ @fabrica/academico (CA-016/CA-017) cargado');
  }

  const { typeDefs, resolvers } = composeModules(modules);
  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
    context: async ({ req }) => ({ user: verifyToken(req.headers.authorization || ''), req }),
  });

  console.log(`Servidor GraphQL listo en ${url}`);
  console.log(`Core Assets activos: ${features.enabledAssets().length}`);
}

startServer();

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
  ensureDatabase,
  ensureBaseTables,
  ensureAuditoriaTable,
} = require('@fabrica/node-core');
const { typeDefs: baseTypeDefs } = require('./schema/typeDefs');
const { buildBaseResolvers, Usuario } = require('./resolvers');
const { connectDB, client } = require('./config/database');
require('dotenv').config();

async function startServer() {
  // 1. Variabilidad: qué Core Assets están activos en este producto.
  const features = crearFeatureToggles();

  // CA-018 · Setup automático de BD: la database y las tablas de cada
  // asset activo se crean solas al arrancar (DDL viaja en las librerías).
  const autoSetup = features.isEnabled('CA-018_SetupBD_Automatico');
  if (autoSetup) {
    console.log('🗄️  CA-018: verificando base de datos y tablas...');
    await ensureDatabase(process.env);
  }

  await connectDB();

  if (autoSetup) {
    await ensureBaseTables(client);
    if (features.isEnabled('CA-012_ModeloAuditoria')) await ensureAuditoriaTable(client);
    if (features.isEnabled('CA-016_ModuloMaterias')) {
      const { ensureMateriasTable, ensureInscripcionesTable } = require('@fabrica/academico');
      await ensureMateriasTable(client);
      if (features.isEnabled('CA-017_ModuloInscripciones')) await ensureInscripcionesTable(client);
    }
  }

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
    // Require condicional: un producto mínimo (sin CA-016) no instala
    // @fabrica/academico, así que solo se carga si el toggle está activo.
    const { createAcademicoModule } = require('@fabrica/academico');
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

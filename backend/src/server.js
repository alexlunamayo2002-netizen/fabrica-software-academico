// ============================================================
// COMPOSITION ROOT del producto (cascarón).
// Todo el código vive en las librerías @fabrica/*; este archivo
// solo ENSAMBLA los Core Assets activos según los feature toggles.
// ============================================================
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const {
  createDbClient, connect,
  ensureDatabase, ensureBaseTables, ensureAuditoriaTable,
  verifyToken,
  createUsuarioModel, createRoleModel, baseTypeDefs, buildBaseResolvers,
  createAuditoriaModule, noopAuditoria,
  composeModules, crearFeatureToggles,
  installAsset, catalogoConEstado, cargarConfig,
} = require('@fabrica/node-core');
require('dotenv').config();

// Raíz del producto: una carpeta arriba de backend/ (donde vive factory-config.json)
const PRODUCT_ROOT = path.join(__dirname, '..', '..');

// SDL + resolvers del instalador de Core Assets (GUI): permite activar un
// asset opcional (auditoría, materias, inscripciones) desde la app sin
// tocar la terminal. Requiere rol ADMIN.
const installerTypeDefs = `#graphql
  type CoreAssetInfo {
    id: String!
    nombre: String!
    descripcion: String!
    activo: Boolean!
  }
  type InstalacionResultado {
    ok: Boolean!
    mensaje: String!
    instalados: [String!]!
  }
  extend type Query {
    catalogoCoreAssets: [CoreAssetInfo!]!
  }
  extend type Mutation {
    instalarCoreAsset(assetId: String!): InstalacionResultado!
  }
`;

function buildInstallerResolvers({ client }) {
  return {
    Query: {
      catalogoCoreAssets: (_, __, ctx) => {
        if (!ctx.user || Number(ctx.user.rol_id) !== 1) throw new Error('No autorizado: se requiere rol ADMIN');
        return catalogoConEstado(cargarConfig(PRODUCT_ROOT));
      },
    },
    Mutation: {
      instalarCoreAsset: async (_, { assetId }, ctx) => {
        if (!ctx.user || Number(ctx.user.rol_id) !== 1) throw new Error('No autorizado: se requiere rol ADMIN');

        const resultado = await installAsset({ productRoot: PRODUCT_ROOT, assetId });

        if (resultado.needsNpmInstall) {
          execSync('npm install --no-audit --no-fund', { cwd: path.join(PRODUCT_ROOT, 'backend'), stdio: 'inherit' });
        }

        // Crear las tablas de lo que se acaba de instalar (orden: materias antes que inscripciones)
        if (resultado.instalados.includes('auditoria')) {
          await ensureAuditoriaTable(client);
        }
        if (resultado.instalados.includes('materias') || resultado.instalados.includes('inscripciones')) {
          const academico = require('@fabrica/academico');
          if (resultado.instalados.includes('materias')) await academico.ensureMateriasTable(client);
          if (resultado.instalados.includes('inscripciones')) await academico.ensureInscripcionesTable(client);
        }

        // Reiniciar el backend para que cargue el módulo recién activado:
        // se "toca" este mismo archivo y nodemon detecta el cambio y reinicia.
        setTimeout(() => {
          fs.utimesSync(__filename, new Date(), new Date());
        }, 300);

        return resultado;
      },
    },
  };
}

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

  // Ensamblaje de módulos según toggles.
  // "coreAssetsActivos" permite al frontend descubrir en runtime qué módulos
  // opcionales están habilitados en ESTE producto, para mostrar (o no) sus
  // vistas/tarjetas sin necesitar código hardcodeado por asset.
  const modules = [
    { typeDefs: baseTypeDefs, resolvers: buildBaseResolvers({ Usuario, Role, auditoria, jwtSecret: process.env.JWT_SECRET }) },
    {
      typeDefs: `extend type Query { coreAssetsActivos: [String!]! }`,
      resolvers: { Query: { coreAssetsActivos: () => features.enabledAssets() } },
    },
    { typeDefs: installerTypeDefs, resolvers: buildInstallerResolvers({ client }) },
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

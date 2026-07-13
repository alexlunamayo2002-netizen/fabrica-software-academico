// ============================================================
// @fabrica/node-core · Punto de entrada
// Core Assets de backend reutilizables por los productos derivados
// de la Línea de Productos de Software (composición por librerías).
// ============================================================
const { createDbClient, connect } = require('./db');
const { verifyToken, getIp } = require('./auth');
const { createAuditoriaModule, createAuditoriaModel, noopAuditoria } = require('./auditoria');
const { composeModules, mergeResolvers } = require('./compose');
const { crearFeatureToggles, cargarConfig } = require('./feature-toggles');

module.exports = {
  // CA-013 · Base de datos
  createDbClient,
  connect,
  // CA-011 · JWT
  verifyToken,
  getIp,
  // CA-012 · Auditoría (módulo componible)
  createAuditoriaModule,
  createAuditoriaModel,
  noopAuditoria,
  // Composición de módulos GraphQL
  composeModules,
  mergeResolvers,
  // Variabilidad (feature toggles)
  crearFeatureToggles,
  cargarConfig,
};

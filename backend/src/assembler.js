/**
 * Assembler SPLE — Composición dinámica por feature flags (HU-S2.7)
 *
 * Lee factory-config.json y ensambla los typeDefs + resolvers del servidor
 * GraphQL según los Core Assets habilitados. Cambiar un flag en el JSON
 * activa o desactiva el módulo en el próximo arranque sin tocar código.
 */
const path = require('path');
const config = require(path.join(__dirname, '../../factory-config.json'));
const assets = config.configuracion_nuevo_proyecto.core_assets;

const { typeDefs: coreDefs, resolvers: coreResolvers } = require('@fabrica/node-core');

const allTypeDefs  = [coreDefs];
let   merged       = { ...coreResolvers, Query: { ...coreResolvers.Query }, Mutation: { ...coreResolvers.Mutation } };

function mergeIn(pkg) {
  merged = {
    ...merged,
    ...pkg.resolvers,
    Query:    { ...merged.Query,    ...pkg.resolvers.Query },
    Mutation: { ...merged.Mutation, ...pkg.resolvers.Mutation },
  };
  allTypeDefs.push(pkg.typeDefs);
}

// ── Punto de variabilidad CA-016: Módulo Materias ─────────────────────────
if (assets['CA-016_ModuloMaterias']) {
  const { materias } = require('@fabrica/academico');
  mergeIn(materias);
  console.log('  [assembler] CA-016 Materias        → ON');
} else {
  console.log('  [assembler] CA-016 Materias        → OFF (podado)');
}

// ── Punto de variabilidad CA-017: Módulo Inscripciones ───────────────────
// CA-017 requiere CA-016 (Inscripcion referencia tipo Materia)
if (assets['CA-017_ModuloInscripciones']) {
  if (!assets['CA-016_ModuloMaterias']) {
    console.warn('  [assembler] ADVERTENCIA: CA-017 requiere CA-016. Activando CA-016 automáticamente.');
    const { materias } = require('@fabrica/academico');
    mergeIn(materias);
  }
  const { inscripciones } = require('@fabrica/academico');
  mergeIn(inscripciones);
  console.log('  [assembler] CA-017 Inscripciones   → ON');
} else {
  console.log('  [assembler] CA-017 Inscripciones   → OFF (podado)');
}

module.exports = { typeDefs: allTypeDefs, resolvers: merged };

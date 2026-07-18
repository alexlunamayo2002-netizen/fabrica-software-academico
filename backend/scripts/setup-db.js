#!/usr/bin/env node
'use strict';

/**
 * setup-db.js — Crea (o resetea) la base de datos local del proyecto
 *
 * Uso:
 *   node scripts/setup-db.js           → crea la BD si no existe y aplica el schema
 *   node scripts/setup-db.js --reset   → elimina la BD y la recrea desde cero
 *
 * Lee credenciales desde backend/.env y assets activos desde factory-config.json
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const DB_NAME = process.env.DB_NAME;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT  || '5432');
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASSWORD || '';
const doReset = process.argv.includes('--reset');

if (!DB_NAME) {
  console.error('\n  ❌ DB_NAME no está definido en .env\n');
  process.exit(1);
}

// ── Leer assets activos desde factory-config.json ────────────────────────────
function getActiveAssets() {
  const cfgPath = path.join(__dirname, '../../factory-config.json');
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    return cfg.configuracion_nuevo_proyecto?.core_assets || null;
  } catch { return null; }
}

// ── Construir SQL según assets activos ───────────────────────────────────────
function buildSchemaSQL(assets) {
  const lines = fs.readFileSync(
    path.join(__dirname, '../database/schema.sql'), 'utf8'
  ).split('\n');

  const active = assets ? {
    ROLES:         true,
    USUARIOS:      true,
    AUDITORIA:     !!(assets['CA-012_ModeloAuditoria']),
    MATERIAS:      !!(assets['CA-016_ModuloMaterias']),
    INSCRIPCIONES: !!(assets['CA-017_ModuloInscripciones']),
  } : { ROLES: true, USUARIOS: true, AUDITORIA: true, MATERIAS: true, INSCRIPCIONES: true };

  let include = true;
  const out   = [];

  for (const line of lines) {
    if (/--\s+M[OÓ]DULO:/i.test(line)) {
      const up = line.toUpperCase();
      if      (up.includes('ROLES'))         include = active.ROLES;
      else if (up.includes('USUARIOS'))      include = active.USUARIOS;
      else if (up.includes('AUDIT'))         include = active.AUDITORIA;
      else if (up.includes('MATERIAS'))      include = active.MATERIAS;
      else if (up.includes('INSCRIPCIONES')) include = active.INSCRIPCIONES;
    }
    if (include) out.push(line);
  }

  return out.join('\n');
}

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

async function main() {
  const assets = getActiveAssets();

  console.log(`\n  🗄️  Base de datos : ${DB_NAME}`);
  console.log(`  Servidor         : ${DB_HOST}:${DB_PORT}`);
  console.log(`  Usuario          : ${DB_USER}`);

  if (assets) {
    const activos = Object.entries(assets)
      .filter(([k, v]) => v && k.startsWith('CA-0'))
      .map(([k]) => k.split('_')[0]);
    console.log(`  Assets activos   : ${activos.join(', ')}\n`);
  } else {
    console.log(`  ${'\x1b[33m'}⚠️  factory-config.json no encontrado — se crearán todas las tablas${'\x1b[0m'}\n`);
  }

  if (doReset) {
    const confirm = (await ask(`  ⚠️  ¿Eliminar y recrear "${DB_NAME}"? Todos los datos se perderán. (s/n): `))
      .trim().toLowerCase();
    if (confirm !== 's') { console.log('\n  Cancelado.\n'); rl.close(); return; }
  }
  rl.close();

  // Crear BD si no existe
  const admin = new Client({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: 'postgres' });
  await admin.connect();

  if (doReset) {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [DB_NAME]
    );
    await admin.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);
    console.log(`  ✅ Base de datos "${DB_NAME}" eliminada.`);
  }

  const { rows } = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
  if (rows.length === 0) {
    await admin.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`  ✅ Base de datos "${DB_NAME}" creada.`);
  } else {
    console.log(`  ℹ️  "${DB_NAME}" ya existe — aplicando schema.`);
  }
  await admin.end();

  // Aplicar schema con solo las tablas de assets activos
  const sql = buildSchemaSQL(assets);
  const db = new Client({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME });
  await db.connect();
  await db.query(sql);
  await db.end();

  // Mostrar tablas creadas
  const tablas = ['roles', 'usuarios'];
  if (!assets || assets['CA-012_ModeloAuditoria'])    tablas.push('auditoria');
  if (!assets || assets['CA-016_ModuloMaterias'])     tablas.push('materias');
  if (!assets || assets['CA-017_ModuloInscripciones']) tablas.push('inscripciones');

  console.log(`  ✅ Schema aplicado — tablas: ${tablas.join(', ')}`);
  console.log(`  ✅ Roles insertados : ADMIN, DOCENTE, ESTUDIANTE\n`);
}

main().catch(err => {
  console.error('\n  ❌ Error:', err.message);
  console.error('  Verifica que PostgreSQL esté corriendo y las credenciales en .env sean correctas.\n');
  process.exit(1);
});

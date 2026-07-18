#!/usr/bin/env node
'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ── Colores ANSI ──────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};
const ok    = `${C.green}✅${C.reset}`;
const cross = `${C.red}❌${C.reset}`;
const warn  = `${C.yellow}⚠️ ${C.reset}`;

// ── Catálogo de Core Assets ───────────────────────────────────────────────────
const MANDATORY = [
  'CA-001  Design System & Tokens CSS',
  'CA-002  Modelo Usuario (Frontend)',
  'CA-003  Auth Service (JWT)',
  'CA-004  Auth Guard',
  'CA-005  Role Guard',
  'CA-006  Página de Login',
  'CA-008  Dashboard por Rol',
  'CA-009  Esquema GraphQL Base',
  'CA-010  Resolvers GraphQL (auth, usuarios)',
  'CA-011  JWT Middleware',
  'CA-013  Configuración Base de Datos (Pool)',
];

const OPTIONAL = [
  {
    key: 'CA-007_RegistroAbierto',
    label: 'CA-007  Registro Público de Usuarios',
    desc:  'Página /registro — visitantes pueden crear su cuenta',
    default: true,
  },
  {
    key: 'CA-012_ModeloAuditoria',
    label: 'CA-012  Auditoría del Sistema',
    desc:  'Panel /auditoria (solo ADMIN) — historial de login/logout/registro',
    default: false,
  },
  {
    key: 'CA-016_ModuloMaterias',
    label: 'CA-016  Módulo de Materias',
    desc:  'CRUD de materias académicas vía GraphQL (@fabrica/academico)',
    default: true,
  },
  {
    key: 'CA-017_ModuloInscripciones',
    label: 'CA-017  Módulo de Inscripciones',
    desc:  'Inscripción de estudiantes a materias (requiere CA-016)',
    default: true,
  },
];

// ── Utilidades ────────────────────────────────────────────────────────────────
const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (['node_modules', '.git', '.angular'].some(x => src.includes(x))) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src))
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
  } else {
    fs.copyFileSync(src, dest);
  }
}

function removeFromFile(filePath, regex) {
  if (!fs.existsSync(filePath)) return;
  let txt = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(filePath, txt.replace(regex, ''));
}

// ── Render del menú ───────────────────────────────────────────────────────────
function printBanner() {
  console.log(`\n${C.cyan}${C.bold}  ╔═══════════════════════════════════════════════════════╗`);
  console.log(`  ║       🏭  FÁBRICA DE SOFTWARE ACADÉMICO v2.0        ║`);
  console.log(`  ╚═══════════════════════════════════════════════════════╝${C.reset}\n`);
}

function renderMenu(sel) {
  console.clear();
  printBanner();

  console.log(`${C.bold}  CORE ASSETS OBLIGATORIOS${C.reset} ${C.dim}(siempre incluidos — no modificables):${C.reset}`);
  MANDATORY.forEach(m => console.log(`    ${ok}  ${C.dim}${m}${C.reset}`));

  console.log(`\n${C.bold}  CORE ASSETS OPCIONALES${C.reset} ${C.dim}— escribe el número para activar/desactivar:${C.reset}`);
  console.log(`  ${'─'.repeat(62)}`);
  OPTIONAL.forEach((a, i) => {
    const on  = sel[a.key];
    const ico = on ? ok : cross;
    const lbl = on
      ? `${C.bold}${C.green}${a.label}${C.reset}`
      : `${C.dim}${a.label}${C.reset}`;
    console.log(`  [${C.bold}${i + 1}${C.reset}] ${ico}  ${lbl}`);
    console.log(`        ${C.dim}${a.desc}${C.reset}`);
  });
  console.log(`  ${'─'.repeat(62)}`);
  console.log(`\n  ${C.dim}👉 Escribe el NÚMERO del asset para marcarlo o desmarcarlo.`);
  console.log(`     Cuando termines de elegir, presiona ENTER sin escribir nada.${C.reset}`);
}

// ── Lógica de poda ────────────────────────────────────────────────────────────
function applyPruning(sel, destFront, destBack, destConfig) {

  // CA-007: Registro público
  if (!sel['CA-007_RegistroAbierto']) {
    console.log(`  ➔ ${warn} CA-007 excluido — eliminando página /registro`);
    const pg = path.join(destFront, 'src/app/pages/registro');
    if (fs.existsSync(pg)) fs.rmSync(pg, { recursive: true, force: true });
    removeFromFile(
      path.join(destFront, 'src/app/app.routes.ts'),
      /\n\s*\{[^\n]*\n\s*path:\s*'registro',[\s\S]*?\},/g
    );
  } else {
    console.log(`  ➔ ${ok} CA-007 incluido`);
  }

  // CA-012: Auditoría (frontend)
  if (!sel['CA-012_ModeloAuditoria']) {
    console.log(`  ➔ ${warn} CA-012 excluido — eliminando panel /auditoria`);
    const pg = path.join(destFront, 'src/app/pages/auditoria');
    if (fs.existsSync(pg)) fs.rmSync(pg, { recursive: true, force: true });
    removeFromFile(
      path.join(destFront, 'src/app/app.routes.ts'),
      /\n\s*\{[^\n]*\n\s*path:\s*'auditoria',[\s\S]*?\},/g
    );
    // Compatibilidad con backend legacy
    const legacyModel = path.join(destBack, 'src/models/Auditoria.js');
    if (fs.existsSync(legacyModel)) fs.unlinkSync(legacyModel);
  } else {
    console.log(`  ➔ ${ok} CA-012 incluido`);
  }

  // CA-016: Materias
  if (!sel['CA-016_ModuloMaterias']) {
    console.log(`  ➔ ${warn} CA-016 excluido — eliminando módulo /materias`);
    const pg = path.join(destFront, 'src/app/pages/materias');
    if (fs.existsSync(pg)) fs.rmSync(pg, { recursive: true, force: true });
    removeFromFile(
      path.join(destFront, 'src/app/app.routes.ts'),
      /\n\s*\{[^\n]*\n\s*path:\s*'materias',[\s\S]*?\},/g
    );
    if (!sel['CA-017_ModuloInscripciones']) {
      const acadPkg = path.join(path.dirname(destBack), 'packages/academico');
      if (fs.existsSync(acadPkg)) {
        fs.rmSync(acadPkg, { recursive: true, force: true });
        console.log(`       ${C.dim}↳ packages/academico eliminado (ningún módulo académico activo)${C.reset}`);
      }
    }
  } else {
    console.log(`  ➔ ${ok} CA-016 incluido`);
  }

  // CA-017: Inscripciones
  if (!sel['CA-017_ModuloInscripciones']) {
    console.log(`  ➔ ${warn} CA-017 excluido — eliminando módulos /inscripciones y /mis-inscripciones`);
    for (const pg of ['inscripciones', 'mis-inscripciones']) {
      const p = path.join(destFront, `src/app/pages/${pg}`);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    }
    removeFromFile(
      path.join(destFront, 'src/app/app.routes.ts'),
      /\n\s*\{[^\n]*\n\s*path:\s*'inscripciones',[\s\S]*?\},/g
    );
    removeFromFile(
      path.join(destFront, 'src/app/app.routes.ts'),
      /\n\s*\{[^\n]*\n\s*path:\s*'mis-inscripciones',[\s\S]*?\},/g
    );
  } else {
    console.log(`  ➔ ${ok} CA-017 incluido`);
  }

  // Actualizar factory-config.json del nuevo proyecto
  const cfg = JSON.parse(fs.readFileSync(destConfig, 'utf8'));
  OPTIONAL.forEach(a => { cfg.configuracion_nuevo_proyecto.core_assets[a.key] = sel[a.key]; });
  cfg.fabrica.ruta_fabrica = __dirname;   // para que gestionar_assets.js pueda encontrar la fábrica
  fs.writeFileSync(destConfig, JSON.stringify(cfg, null, 2));

  // Actualizar environment.ts y environment.prod.ts con los feature flags
  const envDir  = path.join(destFront, 'src/environments');
  const envFiles = ['environment.ts', 'environment.prod.ts'];
  for (const file of envFiles) {
    const envPath = path.join(envDir, file);
    if (!fs.existsSync(envPath)) continue;
    const isProd = file.includes('prod');
    const content = `export const environment = {\n  production: ${isProd},\n  apiUrl: 'http://localhost:4000',\n  features: {\n    registro: ${sel['CA-007_RegistroAbierto'] ?? true},       // CA-007\n    auditoria: ${sel['CA-012_ModeloAuditoria'] ?? false},     // CA-012\n    materias: ${sel['CA-016_ModuloMaterias'] ?? true},       // CA-016\n    inscripciones: ${sel['CA-017_ModuloInscripciones'] ?? true},  // CA-017\n  }\n};\n`;
    fs.writeFileSync(envPath, content);
  }
}

// ── Construir SQL según assets activos ───────────────────────────────────────
function buildSchemaSQL(sel) {
  const lines = fs.readFileSync(
    path.join(__dirname, 'backend/database/schema.sql'), 'utf8'
  ).split('\n');

  const active = {
    ROLES:         true,
    USUARIOS:      true,
    AUDITORIA:     !!(sel['CA-012_ModeloAuditoria']),
    MATERIAS:      !!(sel['CA-016_ModuloMaterias']),
    INSCRIPCIONES: !!(sel['CA-017_ModuloInscripciones']),
  };

  let include = true; // el encabezado del archivo siempre se incluye
  const out   = [];

  for (const line of lines) {
    // Solo cambiar de módulo en líneas de encabezado "-- MÓDULO: ..."
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

// ── Crear base de datos local ─────────────────────────────────────────────────
async function setupDatabase(dbName, pgHost, pgPort, pgUser, pgPassword, sel) {
  const { Client } = require('pg');

  // 1. Conectar al servidor como admin y crear la BD
  const admin = new Client({
    host: pgHost, port: parseInt(pgPort),
    user: pgUser, password: pgPassword,
    database: 'postgres',
  });
  await admin.connect();
  const { rows } = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
  if (rows.length === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();

  // 2. Conectar a la nueva BD y aplicar solo las tablas de los assets activos
  const db = new Client({
    host: pgHost, port: parseInt(pgPort),
    user: pgUser, password: pgPassword,
    database: dbName,
  });
  await db.connect();
  await db.query(buildSchemaSQL(sel));
  await db.end();
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  printBanner();

  // 1. Nombre del proyecto
  const rawName  = await ask(`  ${C.bold}Nombre del nuevo proyecto${C.reset} [NuevoProyecto]: `);
  const projName = rawName.trim() || 'NuevoProyecto';
  const targetDir = path.join(__dirname, '..', projName);

  if (fs.existsSync(targetDir)) {
    console.log(`\n  ${C.red}❌ Error: Ya existe un directorio llamado "${projName}".${C.reset}\n`);
    rl.close(); return;
  }

  // 2. Contraseña de PostgreSQL local (se guarda en .factory-local.json para no volver a preguntar)
  const pgHost = 'localhost';
  const pgPort = '5432';
  const pgUser = 'postgres';
  const localCfgPath = path.join(__dirname, '.factory-local.json');
  let localCfg = {};
  if (fs.existsSync(localCfgPath)) {
    try { localCfg = JSON.parse(fs.readFileSync(localCfgPath, 'utf8')); } catch {}
  }
  let pgPass = localCfg.pg_password || '';
  if (!pgPass) {
    pgPass = (await ask(`\n  ${C.bold}🔑 Contraseña de tu PostgreSQL local${C.reset} ${C.dim}(usuario 'postgres')${C.reset}: `)).trim();
    localCfg.pg_password = pgPass;
    fs.writeFileSync(localCfgPath, JSON.stringify(localCfg, null, 2));
    console.log(`  ${C.dim}✓ Contraseña guardada en .factory-local.json (no se volverá a pedir)${C.reset}`);
  }

  // 3. Selección interactiva
  const sel = {};
  OPTIONAL.forEach(a => { sel[a.key] = a.default; });

  while (true) {
    renderMenu(sel);
    const input = (await ask(`\n  Selección > `)).trim();

    if (input === '') break;

    const idx = parseInt(input, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= OPTIONAL.length) {
      await ask(`  ${C.red}Opción inválida.${C.reset} Presiona Enter...`);
      continue;
    }

    const key = OPTIONAL[idx].key;
    sel[key] = !sel[key];

    // Reglas de dependencia
    if (key === 'CA-016_ModuloMaterias' && !sel[key] && sel['CA-017_ModuloInscripciones']) {
      sel['CA-017_ModuloInscripciones'] = false;
      await ask(`  ${warn}CA-017 desactivado automáticamente (requiere CA-016). Enter...`);
    }
    if (key === 'CA-017_ModuloInscripciones' && sel[key] && !sel['CA-016_ModuloMaterias']) {
      sel['CA-016_ModuloMaterias'] = true;
      await ask(`  ${warn}CA-016 activado automáticamente (CA-017 lo requiere). Enter...`);
    }
  }

  // 4. Confirmación final
  renderMenu(sel);
  const activeList = OPTIONAL.filter(a => sel[a.key]).map(a => a.key.split('_')[0]);
  console.log(`\n  Proyecto : ${C.bold}${C.cyan}${projName}${C.reset}`);
  console.log(`  Destino  : ${C.dim}${targetDir}${C.reset}`);
  console.log(`  Assets   : ${C.green}${activeList.join(', ')} + todos los obligatorios${C.reset}\n`);

  const confirm = (await ask(`  ¿Crear este proyecto? (${C.green}s${C.reset}/${C.red}n${C.reset}): `)).trim().toLowerCase();
  if (confirm !== 's') {
    console.log(`\n  ${C.yellow}Cancelado.${C.reset}\n`);
    rl.close(); return;
  }

  console.log('\n');
  rl.close();

  // 5. Ensamblaje
  const config    = JSON.parse(fs.readFileSync(path.join(__dirname, 'factory-config.json'), 'utf8'));
  const destFront = path.join(targetDir, 'frontend');
  const destBack  = path.join(targetDir, 'backend');
  const destPkgs  = path.join(targetDir, 'packages');
  const destCfg   = path.join(targetDir, 'factory-config.json');

  console.log(`  ${C.bold}📦 1. Extrayendo Core Assets base...${C.reset}`);
  fs.mkdirSync(targetDir);
  copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.frontend), destFront);
  copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.backend),  destBack);
  copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.packages), destPkgs);
  fs.copyFileSync(path.join(__dirname, 'package.json'),          path.join(targetDir, 'package.json'));
  fs.copyFileSync(path.join(__dirname, 'factory-config.json'),   destCfg);
  fs.copyFileSync(path.join(__dirname, 'gestionar_assets.js'),   path.join(targetDir, 'gestionar_assets.js'));
  console.log(`  ${ok} Código base extraído.`);

  console.log(`\n  ${C.bold}🎛️  2. Aplicando Core Assets seleccionados...${C.reset}`);
  applyPruning(sel, destFront, destBack, destCfg);

  console.log(`\n  ${C.bold}⚙️  3. Generando .env...${C.reset}`);
  const dbName = `bd_${projName.toLowerCase().replace(/[\s-]+/g, '_')}`;
  const envContent = [
    `DB_HOST=${pgHost}`,
    `DB_PORT=${pgPort}`,
    `DB_NAME=${dbName}`,
    `DB_USER=${pgUser}`,
    `DB_PASSWORD=${pgPass}`,
    `JWT_SECRET=${projName.toLowerCase()}_secret_${Date.now()}`,
    `PORT=${config.configuracion_nuevo_proyecto.entorno.puerto_backend}`,
    `AUDITORIA_ENABLED=${sel['CA-012_ModeloAuditoria'] ? 'true' : 'false'}`,
  ].join('\n');
  fs.writeFileSync(path.join(destBack, '.env'), envContent);
  console.log(`  ${ok} .env inyectado (BD local: ${dbName}).`);

  console.log(`\n  ${C.bold}🗄️  4. Creando base de datos "${dbName}"...${C.reset}`);
  try {
    await setupDatabase(dbName, pgHost, pgPort, pgUser, pgPass, sel);
    console.log(`  ${ok} Base de datos lista y schema aplicado.`);
  } catch (err) {
    console.log(`  ${warn}No se pudo crear la BD: ${C.red}${err.message}${C.reset}`);
    console.log(`  ${C.dim}↳ Cuando tengas PostgreSQL corriendo, ejecuta:`);
    console.log(`     cd ../${projName}/backend && npm run db:setup${C.reset}`);
  }

  console.log(`
${C.green}${C.bold}  ╔═══════════════════════════════════════════════════════╗
  ║          🎉  ¡PROYECTO ENSAMBLADO CON ÉXITO!         ║
  ╚═══════════════════════════════════════════════════════╝${C.reset}

  ${C.bold}Directorio:${C.reset} ${targetDir}

  ${C.bold}Próximos pasos:${C.reset}
  ${C.dim}1.${C.reset} cd ../${projName}/backend  && npm install && npm run dev
  ${C.dim}2.${C.reset} cd ../${projName}/frontend && npm install && npm start

  ${C.dim}Si la BD no se creó automáticamente:${C.reset}
  ${C.cyan}  cd ../${projName}/backend && npm run db:setup${C.reset}
  ${C.dim}  Para resetear la BD desde cero: npm run db:reset${C.reset}

  ${C.dim}Para gestionar Core Assets más tarde:${C.reset}
  ${C.cyan}  node gestionar_assets.js ../${projName}${C.reset}
  ${C.dim}  (o ejecuta gestionar_assets.js desde dentro del nuevo proyecto)${C.reset}
`);
}

main().catch(err => { console.error('\n  ❌ Error inesperado:', err.message); process.exit(1); });

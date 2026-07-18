#!/usr/bin/env node
'use strict';

/**
 * gestionar_assets.js — Gestor interactivo de Core Assets
 *
 * Uso desde la fábrica:   node gestionar_assets.js <ruta-proyecto>
 * Uso desde el proyecto:  node gestionar_assets.js
 */

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
const plus  = `${C.green}➕${C.reset}`;
const minus = `${C.red}➖${C.reset}`;

// ── Catálogo ──────────────────────────────────────────────────────────────────
const OPTIONAL = [
  {
    key: 'CA-007_RegistroAbierto',
    label: 'CA-007  Registro Público de Usuarios',
    desc:  'Página /registro — visitantes pueden crear su cuenta',
    frontendPages: ['registro'],
    routes: [
      {
        path: 'registro',
        snippet: `  {\n    path: 'registro',\n    loadComponent: () => import('./pages/registro/registro.component').then(c => c.RegistroComponent)\n  },`,
        removeRegex: /\n\s*\{[^\n]*\n\s*path:\s*'registro',[\s\S]*?\},/g,
      },
    ],
  },
  {
    key: 'CA-012_ModeloAuditoria',
    label: 'CA-012  Auditoría del Sistema',
    desc:  'Panel /auditoria (solo ADMIN) — historial de acciones del sistema',
    frontendPages: ['auditoria'],
    routes: [
      {
        path: 'auditoria',
        snippet: `  {\n    path: 'auditoria',\n    loadComponent: () => import('./pages/auditoria/auditoria.component').then(c => c.AuditoriaComponent),\n    canActivate: [authGuard, roleGuard],\n    data: { roles: ['ADMIN'] }\n  },`,
        removeRegex: /\n\s*\{[^\n]*\n\s*path:\s*'auditoria',[\s\S]*?\},/g,
      },
    ],
  },
  {
    key: 'CA-016_ModuloMaterias',
    label: 'CA-016  Módulo de Materias',
    desc:  'CRUD de materias académicas vía GraphQL (@fabrica/academico)',
    frontendPages: ['materias'],
    routes: [
      {
        path: 'materias',
        snippet: `  {\n    path: 'materias',\n    loadComponent: () => import('./pages/materias/materias.component').then(c => c.MateriasComponent),\n    canActivate: [authGuard]\n  },`,
        removeRegex: /\n\s*\{[^\n]*\n\s*path:\s*'materias',[\s\S]*?\},/g,
      },
    ],
  },
  {
    key: 'CA-017_ModuloInscripciones',
    label: 'CA-017  Módulo de Inscripciones',
    desc:  'Inscripción de estudiantes a materias (requiere CA-016)',
    frontendPages: ['inscripciones', 'mis-inscripciones'],
    routes: [
      {
        path: 'inscripciones',
        snippet: `  {\n    path: 'inscripciones',\n    loadComponent: () => import('./pages/inscripciones/inscripciones.component').then(c => c.InscripcionesComponent),\n    canActivate: [authGuard, roleGuard],\n    data: { roles: ['ADMIN', 'DOCENTE'] }\n  },`,
        removeRegex: /\n\s*\{[^\n]*\n\s*path:\s*'inscripciones',[\s\S]*?\},/g,
      },
      {
        path: 'mis-inscripciones',
        snippet: `  {\n    path: 'mis-inscripciones',\n    loadComponent: () => import('./pages/mis-inscripciones/mis-inscripciones.component').then(c => c.MisInscripcionesComponent),\n    canActivate: [authGuard, roleGuard],\n    data: { roles: ['ESTUDIANTE'] }\n  },`,
        removeRegex: /\n\s*\{[^\n]*\n\s*path:\s*'mis-inscripciones',[\s\S]*?\},/g,
      },
    ],
  },
];

// ── Utilidades ────────────────────────────────────────────────────────────────
const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return false;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (['node_modules', '.git', '.angular'].some(x => src.includes(x))) return false;
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src))
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  return true;
}

function isInstalled(assetDef, projectDir) {
  const firstPage = assetDef.frontendPages[0];
  return fs.existsSync(path.join(projectDir, 'frontend/src/app/pages', firstPage));
}

// ── Instalar un asset ─────────────────────────────────────────────────────────
function installAsset(assetDef, projectDir, factoryDir) {
  const routesPath = path.join(projectDir, 'frontend/src/app/app.routes.ts');
  let installed = false;

  // 1. Copiar páginas del frontend desde la fábrica
  for (const pg of assetDef.frontendPages) {
    const src  = path.join(factoryDir, 'frontend/src/app/pages', pg);
    const dest = path.join(projectDir, 'frontend/src/app/pages', pg);
    if (!fs.existsSync(dest)) {
      const ok = copyRecursiveSync(src, dest);
      if (ok) {
        console.log(`       ${plus} Copiado: frontend/src/app/pages/${pg}/`);
        installed = true;
      } else {
        console.log(`       ${warn}No encontrado en fábrica: pages/${pg}/`);
      }
    } else {
      console.log(`       ${C.dim}↳ pages/${pg}/ ya existe — no sobrescrito${C.reset}`);
    }
  }

  // 2. Agregar rutas solo si los archivos se copiaron correctamente
  const allPagesCopied = assetDef.frontendPages.every(pg =>
    fs.existsSync(path.join(projectDir, 'frontend/src/app/pages', pg))
  );

  if (allPagesCopied && fs.existsSync(routesPath)) {
    let routesTxt = fs.readFileSync(routesPath, 'utf8').replace(/\r\n/g, '\n');
    for (const route of assetDef.routes) {
      if (!routesTxt.includes(`path: '${route.path}'`)) {
        routesTxt = routesTxt.replace(
          /(\n\s*\{ path: '\*\*',)/,
          `\n${route.snippet}$1`
        );
        console.log(`       ${plus} Ruta agregada: /${route.path}`);
        installed = true;
      } else {
        console.log(`       ${C.dim}↳ Ruta /${route.path} ya existe — no duplicada${C.reset}`);
      }
    }
    fs.writeFileSync(routesPath, routesTxt);
  } else if (!allPagesCopied) {
    console.log(`       ${warn}Rutas NO agregadas porque los archivos no se copiaron correctamente.`);
  }

  return installed;
}

// ── Desinstalar un asset ──────────────────────────────────────────────────────
function uninstallAsset(assetDef, projectDir) {
  const routesPath = path.join(projectDir, 'frontend/src/app/app.routes.ts');

  // 1. Eliminar páginas del frontend
  for (const pg of assetDef.frontendPages) {
    const p = path.join(projectDir, 'frontend/src/app/pages', pg);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`       ${minus} Eliminado: frontend/src/app/pages/${pg}/`);
    }
  }

  // 2. Eliminar rutas
  if (fs.existsSync(routesPath)) {
    let routesTxt = fs.readFileSync(routesPath, 'utf8').replace(/\r\n/g, '\n');
    for (const route of assetDef.routes) {
      routesTxt = routesTxt.replace(route.removeRegex, '');
      console.log(`       ${minus} Ruta eliminada: /${route.path}`);
    }
    fs.writeFileSync(routesPath, routesTxt);
  }
}

// ── Render del menú ───────────────────────────────────────────────────────────
function printBanner(projName) {
  console.log(`\n${C.cyan}${C.bold}  ╔═══════════════════════════════════════════════════════╗`);
  console.log(`  ║       🔧  GESTIÓN DE CORE ASSETS                    ║`);
  console.log(`  ╚═══════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`  ${C.dim}Proyecto: ${C.reset}${C.bold}${projName}${C.reset}\n`);
}

function renderMenu(sel, projectDir) {
  console.clear();
  printBanner(path.basename(projectDir));
  console.log(`${C.bold}  CORE ASSETS OPCIONALES${C.reset} ${C.dim}— escribe el número para activar/desactivar:${C.reset}`);
  console.log(`  ${'─'.repeat(62)}`);
  OPTIONAL.forEach((a, i) => {
    const on    = sel[a.key];
    const ico   = on ? ok : cross;
    const badge = on
      ? `  ${C.green}${C.dim}[instalado]${C.reset}`
      : `  ${C.dim}[disponible]${C.reset}`;
    const lbl   = on
      ? `${C.bold}${C.green}${a.label}${C.reset}`
      : `${C.dim}${a.label}${C.reset}`;
    console.log(`  [${C.bold}${i + 1}${C.reset}] ${ico}  ${lbl}${badge}`);
    console.log(`        ${C.dim}${a.desc}${C.reset}`);
  });
  console.log(`  ${'─'.repeat(62)}`);
  console.log(`\n  ${C.dim}👉 Escribe el NÚMERO del asset para marcarlo o desmarcarlo.`);
  console.log(`     Cuando termines de elegir, presiona ENTER sin escribir nada.${C.reset}`);
}

// ── Actualizar environment.ts con feature flags ───────────────────────────────
function updateEnvironmentFiles(projectDir, sel) {
  const flags = {
    registro:      sel['CA-007_RegistroAbierto']        ?? true,
    auditoria:     sel['CA-012_ModeloAuditoria']        ?? false,
    materias:      sel['CA-016_ModuloMaterias']         ?? true,
    inscripciones: sel['CA-017_ModuloInscripciones']    ?? true,
  };

  const envDir = path.join(projectDir, 'frontend/src/environments');
  const files  = ['environment.ts', 'environment.prod.ts'];
  const isProd = (f) => f.includes('prod');

  for (const file of files) {
    const envPath = path.join(envDir, file);
    if (!fs.existsSync(envPath)) continue;

    const content = `export const environment = {
  production: ${isProd(file)},
  apiUrl: 'http://localhost:4000',
  features: {
    registro: ${flags.registro},       // CA-007
    auditoria: ${flags.auditoria},     // CA-012
    materias: ${flags.materias},       // CA-016
    inscripciones: ${flags.inscripciones},  // CA-017
  }
};\n`;
    fs.writeFileSync(envPath, content);
    console.log(`       ${plus} Actualizado: frontend/src/environments/${file}`);
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  // Detectar proyecto objetivo
  let projectDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : __dirname;    // Si lo ejecutas desde dentro del proyecto

  const configPath = path.join(projectDir, 'factory-config.json');
  if (!fs.existsSync(configPath)) {
    console.log(`\n  ${C.red}❌ No se encontró factory-config.json en: ${projectDir}${C.reset}`);
    console.log(`  ${C.dim}Uso: node gestionar_assets.js <ruta-del-proyecto>${C.reset}\n`);
    rl.close(); return;
  }

  const config    = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const factoryDir = config.fabrica?.ruta_fabrica || __dirname;

  if (!fs.existsSync(factoryDir)) {
    console.log(`\n  ${warn}No se encontró la fábrica en: ${factoryDir}`);
    console.log(`  ${C.dim}Solo podrás desinstalar assets, no agregar nuevos.${C.reset}\n`);
  }

  // Estado actual: combinar factory-config + presencia real de archivos
  const cfgAssets = config.configuracion_nuevo_proyecto?.core_assets || {};
  const sel = {};
  OPTIONAL.forEach(a => {
    // Se considera instalado si el flag está en true Y los archivos existen
    sel[a.key] = cfgAssets[a.key] === true && isInstalled(a, projectDir);
  });
  const original = { ...sel };

  // Bucle de selección
  while (true) {
    renderMenu(sel, projectDir);
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
      await ask(`  ${warn}CA-017 desactivado (depende de CA-016). Enter...`);
    }
    if (key === 'CA-017_ModuloInscripciones' && sel[key] && !sel['CA-016_ModuloMaterias']) {
      sel['CA-016_ModuloMaterias'] = true;
      await ask(`  ${warn}CA-016 activado automáticamente (CA-017 lo requiere). Enter...`);
    }
  }

  // Calcular cambios
  const toInstall   = OPTIONAL.filter(a => sel[a.key]  && !original[a.key]);
  const toUninstall = OPTIONAL.filter(a => !sel[a.key] && original[a.key]);

  if (toInstall.length === 0 && toUninstall.length === 0) {
    console.log(`\n  ${C.dim}Sin cambios. No se aplicó nada.${C.reset}\n`);
    rl.close(); return;
  }

  // Confirmación
  console.log(`\n  ${C.bold}Cambios pendientes:${C.reset}`);
  toInstall.forEach(a   => console.log(`   ${plus} Instalar  : ${a.label}`));
  toUninstall.forEach(a => console.log(`   ${minus} Desinstalar: ${a.label}`));

  const confirm = (await ask(`\n  ¿Aplicar estos cambios? (${C.green}s${C.reset}/${C.red}n${C.reset}): `)).trim().toLowerCase();
  if (confirm !== 's') {
    console.log(`\n  ${C.yellow}Cancelado.${C.reset}\n`);
    rl.close(); return;
  }

  console.log('\n');
  rl.close();

  // Aplicar cambios
  let hasErrors = false;

  for (const a of toInstall) {
    console.log(`  ${C.bold}Instalando ${a.key}...${C.reset}`);
    if (!fs.existsSync(factoryDir)) {
      console.log(`  ${C.red}❌ No se puede instalar: fábrica no encontrada en ${factoryDir}${C.reset}`);
      hasErrors = true;
      continue;
    }
    installAsset(a, projectDir, factoryDir);
    console.log(`  ${ok} ${a.label} instalado.`);
    if (a.key === 'CA-012_ModeloAuditoria') {
      console.log(`  ${C.dim}↳ BD: ejecuta "npm run db:setup" en backend/ para crear la tabla auditoria.${C.reset}`);
    }
    console.log('');
  }

  for (const a of toUninstall) {
    console.log(`  ${C.bold}Desinstalando ${a.key}...${C.reset}`);
    uninstallAsset(a, projectDir);
    console.log(`  ${ok} ${a.label} desinstalado.`);
    if (a.key === 'CA-012_ModeloAuditoria') {
      console.log(`  ${C.dim}↳ BD: la tabla "auditoria" sigue en la BD — puedes eliminarla manualmente si lo deseas.${C.reset}`);
    }
    console.log('');
  }

  // Actualizar factory-config.json del proyecto
  OPTIONAL.forEach(a => { config.configuracion_nuevo_proyecto.core_assets[a.key] = sel[a.key]; });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Actualizar environment.ts y environment.prod.ts con los feature flags
  updateEnvironmentFiles(projectDir, sel);

  // Actualizar AUDITORIA_ENABLED en backend/.env
  const backendEnvPath = path.join(projectDir, 'backend/.env');
  if (fs.existsSync(backendEnvPath)) {
    let envTxt = fs.readFileSync(backendEnvPath, 'utf8');
    const flag = `AUDITORIA_ENABLED=${sel['CA-012_ModeloAuditoria'] ? 'true' : 'false'}`;
    if (envTxt.includes('AUDITORIA_ENABLED=')) {
      envTxt = envTxt.replace(/AUDITORIA_ENABLED=.*/,  flag);
    } else {
      envTxt = envTxt.trimEnd() + '\n' + flag + '\n';
    }
    fs.writeFileSync(backendEnvPath, envTxt);
    console.log(`       ${plus} Actualizado: backend/.env (AUDITORIA_ENABLED)`);
  }

  const finalActive = OPTIONAL.filter(a => sel[a.key]).map(a => a.key.split('_')[0]);
  console.log(`${C.green}${C.bold}  ✅ factory-config.json, environment y .env actualizados.${C.reset}`);
  console.log(`  Assets activos: ${C.cyan}${finalActive.join(', ')}${C.reset}\n`);

  console.log(`  ${C.dim}Reinicia el servidor Angular (ng serve) y el backend para ver los cambios.${C.reset}\n`);
}

main().catch(err => { console.error('\n  ❌ Error inesperado:', err.message); process.exit(1); });

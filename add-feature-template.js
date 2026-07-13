// ============================================================
// FÁBRICA DE SOFTWARE — CLI "add-feature" (se copia a scripts/
// de cada producto derivado).
//
// Uso:  node scripts/add-feature.js <modulo>
//   Módulos: auditoria · materias · inscripciones
//
// Qué hace:
//   1. Activa el feature toggle en factory-config.json
//   2. Instala la librería backend @fabrica/* desde GitHub (si aplica)
//   3. Descarga el frontend del asset desde GitHub (páginas, servicios, modelos)
//   4. Inyecta la ruta en app.routes.ts y el acceso en el panel admin
//   5. Crea las tablas del asset en la BD (scripts/setup_db.js)
// ============================================================
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_OWNER = 'alexlunamayo2002-netizen';
const REPO_NAME = 'fabrica-software-academico';
const BRANCH = 'main';

// Raíz del producto (este script vive en <producto>/scripts/)
const ROOT = path.join(__dirname, '..');

const FEATURES = {
  'auditoria': {
    configKey: 'CA-012_ModeloAuditoria',
    // La librería backend de auditoría ya viene dentro de @fabrica/node-core
    backendDep: null,
    frontendDirs: ['frontend/src/app/pages/auditoria'],
    frontendFiles: [],
    route: {
      comment: '// Sprint 2 · CA-012 Auditoría',
      path: 'auditoria',
      componentName: 'AuditoriaComponent',
      importPath: './pages/auditoria/auditoria.component'
    },
    adminCard: { icon: '🔍', label: 'Registro de auditoría', link: '/auditoria' }
  },
  'materias': {
    configKey: 'CA-016_ModuloMaterias',
    backendDep: '@fabrica/academico',
    frontendDirs: ['frontend/src/app/pages/materias'],
    frontendFiles: [
      'frontend/src/app/services/materia.service.ts',
      'frontend/src/app/models/materia.model.ts'
    ],
    route: {
      comment: '// Sprint 2 · CA-016 Materias',
      path: 'materias',
      componentName: 'MateriasComponent',
      importPath: './pages/materias/materias.component'
    },
    adminCard: { icon: '📚', label: 'Gestionar materias', link: '/materias' }
  },
  'inscripciones': {
    configKey: 'CA-017_ModuloInscripciones',
    backendDep: '@fabrica/academico',
    dependsOn: ['materias'],          // el componente usa MateriaService y la tabla tiene FK a materias
    frontendDirs: ['frontend/src/app/pages/inscripciones'],
    frontendFiles: [
      'frontend/src/app/services/inscripcion.service.ts',
      'frontend/src/app/models/inscripcion.model.ts'
    ],
    route: {
      comment: '// Sprint 2 · CA-017 Inscripciones',
      path: 'inscripciones',
      componentName: 'InscripcionesComponent',
      importPath: './pages/inscripciones/inscripciones.component'
    },
    adminCard: { icon: '📝', label: 'Gestionar inscripciones', link: '/inscripciones' }
  }
};

// ── Descarga desde GitHub ────────────────────────────────────
async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar ${url}: ${res.statusText}`);
  const text = await res.text();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
}

async function downloadRepoFile(repoPath, localDest) {
  const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${repoPath}`;
  await downloadFile(rawUrl, localDest);
  console.log(`  ⬇️  ${repoPath}`);
}

async function downloadDirectory(githubPath, localDest) {
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${githubPath}?ref=${BRANCH}`;
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`No se pudo listar ${apiUrl}: ${res.statusText}`);
  const contents = await res.json();

  for (const item of contents) {
    const itemDest = path.join(localDest, item.name);
    if (item.type === 'file') {
      await downloadFile(item.download_url, itemDest);
      console.log(`  ⬇️  ${item.path}`);
    } else if (item.type === 'dir') {
      await downloadDirectory(item.path, itemDest);
    }
  }
}

// ── Inyecciones en el frontend ───────────────────────────────
function injectRoute(route) {
  const routesPath = path.join(ROOT, 'frontend', 'src', 'app', 'app.routes.ts');
  if (!fs.existsSync(routesPath)) {
    console.log(`  ⚠️  No se encontró app.routes.ts; ruta no inyectada.`);
    return;
  }
  let content = fs.readFileSync(routesPath, 'utf8');

  if (content.includes(`path: '${route.path}'`)) {
    console.log(`  ✔️  La ruta '${route.path}' ya existe.`);
    return;
  }

  const wildcardIndex = content.lastIndexOf("{ path: '**'");
  if (wildcardIndex === -1) {
    console.log(`  ⚠️  No se encontró la ruta comodín '**'; ruta no inyectada.`);
    return;
  }

  const newRoute = `${route.comment}\n  {\n    path: '${route.path}',\n    loadComponent: () => import('${route.importPath}').then(c => c.${route.componentName}),\n    canActivate: [authGuard]\n  },\n  `;
  content = content.slice(0, wildcardIndex) + newRoute + content.slice(wildcardIndex);
  fs.writeFileSync(routesPath, content);
  console.log(`  ✅ Ruta '/${route.path}' inyectada en app.routes.ts`);
}

function injectAdminCard(card) {
  const adminHtml = path.join(ROOT, 'frontend', 'src', 'app', 'pages', 'admin', 'admin.component.html');
  if (!fs.existsSync(adminHtml)) return;
  let content = fs.readFileSync(adminHtml, 'utf8');
  if (content.includes(`routerLink="${card.link}"`)) return;

  const marker = '<!-- add-feature:insert-here -->';
  if (!content.includes(marker)) return;

  const cardHtml = `<a routerLink="${card.link}" class="stat-card" style="text-decoration:none;">\n        <div class="value">${card.icon}</div>\n        <div class="label">${card.label}</div>\n      </a>\n      ${marker}`;
  content = content.replace(marker, cardHtml);
  fs.writeFileSync(adminHtml, content);
  console.log(`  ✅ Acceso rápido añadido al Panel de Administración`);
}

// ── Backend: dependencia de GitHub ───────────────────────────
function ensureBackendDep(depName) {
  const pkgPath = path.join(ROOT, 'backend', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.dependencies[depName]) {
    console.log(`  ✔️  ${depName} ya está en backend/package.json`);
    return false;
  }
  const branch = depName === '@fabrica/academico' ? 'pkg/academico' : 'pkg/node-core';
  pkg.dependencies[depName] = `github:${REPO_OWNER}/${REPO_NAME}#${branch}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log(`  ✅ ${depName} → github:${REPO_OWNER}/${REPO_NAME}#${branch}`);
  return true;
}

// ── Flujo principal ──────────────────────────────────────────
async function addFeature(featureName, { isDependency = false } = {}) {
  const feature = FEATURES[featureName.toLowerCase()];
  if (!feature) {
    console.error(`❌ Módulo desconocido: ${featureName}`);
    console.error(`   Disponibles: ${Object.keys(FEATURES).join(', ')}`);
    process.exit(1);
  }

  // 0. Dependencias entre features (ej: inscripciones necesita materias)
  for (const dep of feature.dependsOn || []) {
    console.log(`\n🔗 '${featureName}' depende de '${dep}' — instalando primero...`);
    await addFeature(dep, { isDependency: true });
  }

  console.log(`\n📦 Instalando módulo: ${featureName.toUpperCase()} (${feature.configKey})`);
  console.log('─'.repeat(50));

  // 1. Activar el feature toggle
  const configPath = path.join(ROOT, 'factory-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const assets = config.configuracion_nuevo_proyecto.core_assets;
  if (assets[feature.configKey] === true) {
    console.log(`  ✔️  ${feature.configKey} ya estaba activo`);
  } else {
    assets[feature.configKey] = true;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`  ✅ ${feature.configKey} activado en factory-config.json`);
  }

  // 2. Dependencia backend desde GitHub
  let installNeeded = false;
  if (feature.backendDep) {
    installNeeded = ensureBackendDep(feature.backendDep);
  }

  // 3. Descargar frontend (páginas + servicios + modelos)
  console.log(`  🌐 Descargando frontend desde GitHub (${BRANCH})...`);
  for (const dir of feature.frontendDirs) {
    const localDest = path.join(ROOT, ...dir.split('/'));
    if (fs.existsSync(localDest)) {
      console.log(`  ✔️  ${dir} ya existe localmente`);
    } else {
      await downloadDirectory(dir, localDest);
    }
  }
  for (const file of feature.frontendFiles) {
    const localDest = path.join(ROOT, ...file.split('/'));
    if (fs.existsSync(localDest)) {
      console.log(`  ✔️  ${file} ya existe localmente`);
    } else {
      await downloadRepoFile(file, localDest);
    }
  }

  // 4. Inyectar ruta y acceso en el panel admin
  injectRoute(feature.route);
  if (feature.adminCard) injectAdminCard(feature.adminCard);

  // 5. Instalar la librería backend (npm install baja la lib de GitHub)
  if (installNeeded) {
    console.log(`  📥 Ejecutando npm install en backend/ (baja la librería de GitHub)...`);
    execSync('npm install --no-audit --no-fund', { stdio: 'inherit', cwd: path.join(ROOT, 'backend') });
  }

  // 6. Crear tablas en la BD según los toggles actualizados
  if (!isDependency) {
    console.log(`  🗄️  Ejecutando setup de BD (crea las tablas del asset)...`);
    execSync('node setup_db.js', { stdio: 'inherit', cwd: __dirname });
  }

  console.log(`\n🎉 ¡Módulo '${featureName}' instalado!`);
  if (!isDependency) {
    console.log(`   Reinicia el backend (npm run dev): cargará el módulo y,`);
    console.log(`   con CA-018 activo, verificará sus tablas automáticamente.`);
  }
}

const arg = process.argv[2];
if (!arg) {
  console.log('Uso: node scripts/add-feature.js <modulo>');
  console.log(`Módulos disponibles: ${Object.keys(FEATURES).join(', ')}`);
  process.exit(1);
}

addFeature(arg).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

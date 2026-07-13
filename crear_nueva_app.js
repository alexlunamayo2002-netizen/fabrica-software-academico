const fs = require('fs');
const path = require('path');

// 1. Cargar Configuración de la Fábrica
const configPath = path.join(__dirname, 'factory-config.json');
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    console.error("❌ Error: No se encontró factory-config.json. ¿Estás en la raíz de la fábrica?");
    process.exit(1);
}

// 2. Obtener el nombre del proyecto de los argumentos de consola
const projectName = process.argv[2] || config.configuracion_nuevo_proyecto.nombre_default;
const targetDir = path.join(__dirname, '..', projectName);

console.log(`\n🏭 INICIANDO ENSAMBLAJE DE LÍNEA DE PRODUCTO: ${projectName}`);
console.log(`========================================================`);

// Copia recursiva (omite node_modules, .git, .angular, dist)
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (/node_modules|\.git|\.angular|[\\/]dist([\\/]|$)/.test(src)) return;
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(function (childItemName) {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Borra bloques de un archivo por regex (para poda de frontend estático)
function removeFromFile(filePath, regex, replacement = '') {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(regex, replacement);
        fs.writeFileSync(filePath, content);
    }
}

try {
    if (fs.existsSync(targetDir)) {
        console.error(`❌ Error: El directorio ${targetDir} ya existe. Elige otro nombre.`);
        process.exit(1);
    }

    console.log(`\n📦 1. Extrayendo Core Assets y librerías @fabrica/*...`);
    fs.mkdirSync(targetDir);

    const destFrontend = path.join(targetDir, 'frontend');
    const destBackend = path.join(targetDir, 'backend');
    const destPackages = path.join(targetDir, 'packages');

    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.frontend), destFrontend);
    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.backend), destBackend);
    // Copiar las librerías del monorepo para que el producto las consuma vía npm install
    copyRecursiveSync(path.join(__dirname, 'packages'), destPackages);
    console.log(`✅ Código base y librerías extraídos.`);

    // El producto lleva su propia configuración de la fábrica (feature toggles runtime)
    fs.writeFileSync(path.join(targetDir, 'factory-config.json'), JSON.stringify(config, null, 2));

    // package.json raíz del producto (NPM Workspaces enlaza @fabrica/* localmente)
    const rootPkg = {
        name: projectName.toLowerCase(),
        version: '1.0.0',
        private: true,
        description: `Producto derivado de la Fábrica de Software Académico: ${projectName}`,
        workspaces: ['packages/*', 'backend', 'frontend'],
        scripts: {
            'dev:backend': 'npm run dev --workspace=backend',
            'start:frontend': 'npm start --workspace=frontend'
        }
    };
    fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(rootPkg, null, 2));
    console.log(`✅ Monorepo del producto configurado (NPM Workspaces).`);

    console.log(`\n🎛️  2. Aplicando variabilidad (feature toggles)...`);
    const assets = config.configuracion_nuevo_proyecto.core_assets;

    // Avisos de commonalities obligatorias
    const obligatorios = [
        'CA-001_DesignSystem', 'CA-002_ModeloUsuarioFront', 'CA-003_AuthService',
        'CA-004_AuthGuard', 'CA-005_RoleGuard', 'CA-006_Login', 'CA-008_Dashboard',
        'CA-009_EsquemaGraphQLBase', 'CA-010_ResolversGraphQL', 'CA-011_JWTMiddleware',
        'CA-013_ConfiguracionBD'
    ];
    for (const ca of obligatorios) {
        if (assets[ca] === false) {
            console.log(`  ⚠️  [${ca}] es OBLIGATORIO (commonality); se mantiene aunque esté en false.`);
        }
    }

    // --- BACKEND: variabilidad por composición en runtime ---------------------
    // El backend (server.js) compone los módulos @fabrica/* según los toggles de
    // factory-config.json. NO se poda código: un asset desactivado simplemente no
    // se carga. Esto cubre CA-012 (Auditoría), CA-016 (Materias) y CA-017.
    const estadoBackend = (ca) => (assets[ca] !== false ? '✅ activo' : '➔ ✂️ inactivo (no se carga)');
    console.log(`  Backend · CA-012 Auditoría:     ${estadoBackend('CA-012_ModeloAuditoria')}`);
    console.log(`  Backend · CA-016 Materias:      ${estadoBackend('CA-016_ModuloMaterias')}`);
    console.log(`  Backend · CA-017 Inscripciones: ${estadoBackend('CA-017_ModuloInscripciones')}`);

    // --- FRONTEND: poda estática (Angular necesita eliminar rutas/componentes) -
    const routesPath = path.join(destFrontend, 'src', 'app', 'app.routes.ts');

    // CA-007 · Registro abierto
    if (assets['CA-007_RegistroAbierto'] === false) {
        console.log(`  ➔ ✂️  Frontend: podando [CA-007_RegistroAbierto]`);
        const registroPath = path.join(destFrontend, 'src', 'app', 'pages', 'registro');
        if (fs.existsSync(registroPath)) fs.rmSync(registroPath, { recursive: true, force: true });
        removeFromFile(routesPath, /,\n\s*{\n\s*path: 'registro',[\s\S]*?}/g);
    }

    // Poda de un módulo académico en el frontend (página + servicio + ruta)
    const materiasOn = assets['CA-016_ModuloMaterias'] !== false;
    const inscripcionesOn = materiasOn && assets['CA-017_ModuloInscripciones'] !== false;

    function podarFrontendModulo(ca, opts) {
        console.log(`  ➔ ✂️  Frontend: podando [${ca}]`);
        const page = path.join(destFrontend, 'src', 'app', 'pages', opts.page);
        if (fs.existsSync(page)) fs.rmSync(page, { recursive: true, force: true });
        const service = path.join(destFrontend, 'src', 'app', 'services', opts.service);
        if (fs.existsSync(service)) fs.unlinkSync(service);
        removeFromFile(routesPath, opts.routeRegex);
    }

    if (!inscripcionesOn) {
        podarFrontendModulo('CA-017_ModuloInscripciones', {
            page: 'inscripciones',
            service: 'inscripcion.service.ts',
            routeRegex: /,\n\s*\/\/ Sprint 2 · CA-017 Inscripciones\n\s*{\n[\s\S]*?canActivate: \[authGuard\]\n\s*}/g
        });
    }
    if (!materiasOn) {
        podarFrontendModulo('CA-016_ModuloMaterias', {
            page: 'materias',
            service: 'materia.service.ts',
            routeRegex: /,\n\s*\/\/ Sprint 2 · CA-016 Materias\n\s*{\n[\s\S]*?canActivate: \[authGuard\]\n\s*}/g
        });
    }

    console.log(`\n⚙️  3. Generando configuración de entorno base...`);
    const envContent = `DB_HOST=${config.configuracion_nuevo_proyecto.entorno.db_host_template}
DB_PORT=5432
DB_NAME=bd_${projectName.toLowerCase()}
DB_USER=root
DB_PASSWORD=secret
JWT_SECRET=super_secreto_generado_en_fabrica
PORT=${config.configuracion_nuevo_proyecto.entorno.puerto_backend}
DB_SSL=true
`;
    fs.writeFileSync(path.join(destBackend, '.env'), envContent);
    console.log(`✅ Archivo .env inyectado.`);

    console.log(`\n🎉 ¡PROYECTO ENSAMBLADO CON ÉXITO!`);
    console.log(`========================================================`);
    console.log(`Siguientes pasos:`);
    console.log(`1. cd ../${projectName}`);
    console.log(`2. npm install            # enlaza las librerías @fabrica/*`);
    console.log(`3. Configura backend/.env con tus credenciales de BD`);
    console.log(`4. npm run dev:backend    # y en otra terminal: npm run start:frontend`);
    console.log(`\n¡Gracias por usar la Fábrica de Software Académico!\n`);

} catch (err) {
    console.error("❌ Ocurrió un error al ensamblar el proyecto:", err);
}

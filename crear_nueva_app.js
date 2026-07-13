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

// Función para copiar directorios recursivamente
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (src.includes('node_modules') || src.includes('.git') || src.includes('.angular')) return;
        
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(function(childItemName) {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Función auxiliar para borrar bloques de código de archivos
function removeFromFile(filePath, regex, replacement = '') {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/\r\n/g, '\n');
        content = content.replace(regex, replacement);
        fs.writeFileSync(filePath, content);
    }
}

try {
    if (fs.existsSync(targetDir)) {
        console.error(`❌ Error: El directorio ${targetDir} ya existe. Elige otro nombre.`);
        process.exit(1);
    }

    console.log(`\n📦 1. Extrayendo Base de Core Assets...`);
    fs.mkdirSync(targetDir);

    const destFrontend  = path.join(targetDir, 'frontend');
    const destBackend   = path.join(targetDir, 'backend');
    const destPackages  = path.join(targetDir, 'packages');

    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.frontend),  destFrontend);
    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.backend),   destBackend);
    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.packages),  destPackages);

    // Copiar package.json raíz y factory-config.json al nuevo proyecto
    fs.copyFileSync(path.join(__dirname, 'package.json'),        path.join(targetDir, 'package.json'));
    fs.copyFileSync(path.join(__dirname, 'factory-config.json'), path.join(targetDir, 'factory-config.json'));

    console.log(`✅ Código base extraído (frontend + backend + packages @fabrica/*)`);

    console.log(`\n🎛️  2. Verificando Configuración de Core Assets...`);
    const assets = config.configuracion_nuevo_proyecto.core_assets;

    // Validación de Assets Obligatorios (Commonalities)
    const obligatorios = [
        'CA-001_DesignSystem', 'CA-002_ModeloUsuarioFront', 'CA-003_AuthService',
        'CA-004_AuthGuard', 'CA-005_RoleGuard', 'CA-006_Login', 'CA-008_Dashboard',
        'CA-009_EsquemaGraphQLBase', 'CA-010_ResolversGraphQL', 'CA-011_JWTMiddleware', 
        'CA-013_ConfiguracionBD'
    ];

    for (const ca of obligatorios) {
        if (!assets[ca]) {
            console.log(`  ⚠️  ADVERTENCIA: Has marcado [${ca}] como false, pero es un Core Asset OBLIGATORIO. El sistema lo mantendrá clonado para evitar romper la arquitectura base.`);
        }
    }

    // =========================================================================
    // REGLA 1: AUDITORÍA (CA-012) - Punto de Variabilidad
    // =========================================================================
    if (!assets['CA-012_ModeloAuditoria']) {
        console.log(`  ➔ ✂️  Poda detectada: [CA-012_ModeloAuditoria] deshabilitada. Eliminando dependencias de código...`);
        
        // 1. Borrar archivo del modelo y scripts
        const auditoriaModelPath = path.join(destBackend, 'src', 'models', 'Auditoria.js');
        if (fs.existsSync(auditoriaModelPath)) fs.unlinkSync(auditoriaModelPath);
        
        const createAuditScript = path.join(destBackend, 'scripts', 'create_audit_table.js');
        if (fs.existsSync(createAuditScript)) fs.unlinkSync(createAuditScript);

        const migrateAuditScript = path.join(destBackend, 'scripts', 'migrate_auditoria.js');
        if (fs.existsSync(migrateAuditScript)) fs.unlinkSync(migrateAuditScript);

        // 2. Limpiar GraphQL Schema
        const typeDefsPath = path.join(destBackend, 'src', 'schema', 'typeDefs.js');
        removeFromFile(typeDefsPath, /\n *type Auditoria \{[\s\S]*?\}\n/g);
        removeFromFile(typeDefsPath, /^ *auditoria\(.*?\): \[Auditoria!\]!\n/gm);
        removeFromFile(typeDefsPath, /^ *auditoriaByUsuario\(.*?\): \[Auditoria!\]!\n/gm);
        removeFromFile(typeDefsPath, /^ *auditoriaByAccion\(.*?\): \[Auditoria!\]!\n/gm);

        // 3. Limpiar Resolvers
        const resolversPath = path.join(destBackend, 'src', 'resolvers', 'index.js');
        removeFromFile(resolversPath, /^ *const \{ Auditoria \} = require\('\.\.\/models\/Auditoria'\);\n/gm);
        removeFromFile(resolversPath, /^ *Auditoria: \{[\s\S]*?\n {2}\},\n/gm);
        removeFromFile(resolversPath, /\n\n *\/\/ Queries de auditoría[\s\S]*?auditoriaByAccion[\s\S]*?\n {4}\},/g);
        // Quitar llamadas al método registrar() dentro de login/logout/registro
        removeFromFile(resolversPath, /\n *\/\/ 4\. Registrar evento de auditoría[\s\S]*?ipAddress\n *\}\);/g);
        removeFromFile(resolversPath, /\n *\/\/ Registrar intento fallido de login[\s\S]*?ipAddress\n *\}\);/g);
        removeFromFile(resolversPath, /\n *\/\/ 4\. Registrar login exitoso[\s\S]*?ipAddress\n *\}\);/g);
        removeFromFile(resolversPath, /\n *\/\/ Registrar logout[\s\S]*?ipAddress\n *\}\);/g);
        removeFromFile(resolversPath, /^ *const ipAddress = context\.req \? .*? 'desconocida';\n/gm);

        // 4. Limpiar schema.sql (tabla auditoria + índices)
        const schemaPath = path.join(destBackend, 'database', 'schema.sql');
        removeFromFile(schemaPath, /\n\n-- =+\n-- MÓDULO: AUDITORÍA[\s\S]*$/g);
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: [CA-012_ModeloAuditoria]`);
    }

    // =========================================================================
    // REGLA 2: REGISTRO ABIERTO (CA-007) - Punto de Variabilidad
    // =========================================================================
    if (!assets['CA-007_RegistroAbierto']) {
        console.log(`  ➔ ✂️  Poda detectada: [CA-007_RegistroAbierto] cerrado. Eliminando pantallas de frontend...`);
        
        // 1. Eliminar carpeta del frontend
        const registroPath = path.join(destFrontend, 'src', 'app', 'pages', 'registro');
        if (fs.existsSync(registroPath)) {
            fs.rmSync(registroPath, { recursive: true, force: true });
        }
        
        // 2. Limpiar ruta en app.routes.ts
        const routesPath = path.join(destFrontend, 'src', 'app', 'app.routes.ts');
        removeFromFile(routesPath, /\n\s*\{[^\n]*\n\s*path:\s*'registro',[\s\S]*?\},/g);
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: [CA-007_RegistroAbierto]`);
    }

    // =========================================================================
    // REGLA 3: MÓDULO MATERIAS (CA-016) - Punto de Variabilidad
    // =========================================================================
    if (!assets['CA-016_ModuloMaterias']) {
        console.log(`  ➔ ✂️  Poda detectada: [CA-016_ModuloMaterias] deshabilitada.`);

        // 1. Eliminar paquete @fabrica/academico — solo si CA-017 también está off
        if (!assets['CA-017_ModuloInscripciones']) {
            const academicoPath = path.join(destPackages, 'academico');
            if (fs.existsSync(academicoPath)) {
                fs.rmSync(academicoPath, { recursive: true, force: true });
                console.log(`     ✂️  Eliminado packages/academico (ningún CA académico activo)`);
            }
        }

        // 2. Marcar CA-016 como false en factory-config.json del nuevo proyecto
        const destConfig = path.join(targetDir, 'factory-config.json');
        const destCfgObj = JSON.parse(fs.readFileSync(destConfig, 'utf8'));
        destCfgObj.configuracion_nuevo_proyecto.core_assets['CA-016_ModuloMaterias'] = false;
        fs.writeFileSync(destConfig, JSON.stringify(destCfgObj, null, 2));

        // 3. Eliminar página de materias del frontend
        const materiasPage = path.join(destFrontend, 'src', 'app', 'pages', 'materias');
        if (fs.existsSync(materiasPage)) fs.rmSync(materiasPage, { recursive: true, force: true });

        // 4. Quitar ruta /materias de app.routes.ts
        const routesPath = path.join(destFrontend, 'src', 'app', 'app.routes.ts');
        removeFromFile(routesPath, /\n\s*\{[^\n]*\n\s*path:\s*'materias',[\s\S]*?\n\s*\},/g);

        console.log(`     El assembler excluirá CA-016 automáticamente al arrancar.`);
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: [CA-016_ModuloMaterias]`);
    }

    // =========================================================================
    // REGLA 4: MÓDULO INSCRIPCIONES (CA-017) - Punto de Variabilidad
    // =========================================================================
    if (!assets['CA-017_ModuloInscripciones']) {
        console.log(`  ➔ ✂️  Poda detectada: [CA-017_ModuloInscripciones] deshabilitada.`);

        // 1. Marcar CA-017 como false en factory-config.json del nuevo proyecto
        const destConfig = path.join(targetDir, 'factory-config.json');
        const destCfgObj = JSON.parse(fs.readFileSync(destConfig, 'utf8'));
        destCfgObj.configuracion_nuevo_proyecto.core_assets['CA-017_ModuloInscripciones'] = false;
        fs.writeFileSync(destConfig, JSON.stringify(destCfgObj, null, 2));

        // 2. Eliminar página de inscripciones del frontend
        const inscripcionesPage = path.join(destFrontend, 'src', 'app', 'pages', 'inscripciones');
        if (fs.existsSync(inscripcionesPage)) fs.rmSync(inscripcionesPage, { recursive: true, force: true });

        // 3. Quitar ruta /inscripciones de app.routes.ts
        const routesPath = path.join(destFrontend, 'src', 'app', 'app.routes.ts');
        removeFromFile(routesPath, /\n\s*\{[^\n]*\n\s*path:\s*'inscripciones',[\s\S]*?\n\s*\},/g);

        console.log(`     El assembler excluirá CA-017 automáticamente al arrancar.`);
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: [CA-017_ModuloInscripciones]`);
    }

    console.log(`\n⚙️  3. Generando configuración de entorno base...`);
    const envContent = `DB_HOST=${config.configuracion_nuevo_proyecto.entorno.db_host_template}
DB_PORT=5432
DB_NAME=bd_${projectName.toLowerCase()}
DB_USER=root
DB_PASSWORD=secret
JWT_SECRET=super_secreto_generado_en_fabrica
PORT=${config.configuracion_nuevo_proyecto.entorno.puerto_backend}
`;
    fs.writeFileSync(path.join(destBackend, '.env'), envContent);
    console.log(`✅ Archivo .env inyectado.`);

    console.log(`\n🎉 ¡PROYECTO ENSAMBLADO CON ÉXITO!`);
    console.log(`========================================================`);
    console.log(`Siguientes pasos:`);
    console.log(`1. cd ../${projectName}/backend`);
    console.log(`2. npm install`);
    console.log(`3. npm run dev`);
    console.log(`\n¡Gracias por usar la Fábrica de Software Académico!\n`);

} catch (err) {
    console.error("❌ Ocurrió un error al ensamblar el proyecto:", err);
}

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
const targetDir = path.join(__dirname, '..', projectName); // Se crea al mismo nivel que FABRICA

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
    
    const destFrontend = path.join(targetDir, 'frontend');
    const destBackend = path.join(targetDir, 'backend');

    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.frontend), destFrontend);
    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.backend), destBackend);
    
    console.log(`✅ Código base extraído.`);

    console.log(`\n🎛️  2. Aplicando Variabilidad Inteligente (Poda de Core Assets)...`);
    const features = config.configuracion_nuevo_proyecto.features;

    // =========================================================================
    // REGLA 1: AUDITORÍA (CA-012)
    // =========================================================================
    if (!features.usarAuditoria) {
        console.log(`  ➔ ✂️ Poda detectada: Auditoría deshabilitada. Eliminando dependencias de código...`);
        
        // 1. Borrar archivo del modelo
        const auditoriaModelPath = path.join(destBackend, 'src', 'models', 'Auditoria.js');
        if (fs.existsSync(auditoriaModelPath)) fs.unlinkSync(auditoriaModelPath);
        
        // 2. Limpiar GraphQL Schema (Eliminar tipo y queries)
        const typeDefsPath = path.join(destBackend, 'src', 'schema', 'typeDefs.js');
        removeFromFile(typeDefsPath, /type Auditoria {[\s\S]*?}\n\n/g);
        removeFromFile(typeDefsPath, /\s*auditoria\(.*?\): \[Auditoria!\]!\n/g);
        removeFromFile(typeDefsPath, /\s*auditoriaByUsuario\(.*?\): \[Auditoria!\]!\n/g);
        removeFromFile(typeDefsPath, /\s*auditoriaByAccion\(.*?\): \[Auditoria!\]!\n/g);
        
        // 3. Limpiar Resolvers (Eliminar importaciones, resolvers de campo, queries y registro de eventos)
        const resolversPath = path.join(destBackend, 'src', 'resolvers', 'index.js');
        // Quitar importación
        removeFromFile(resolversPath, /const { Auditoria } = require\('\.\.\/models\/Auditoria'\);\n/g);
        // Quitar resolver de campo
        removeFromFile(resolversPath, /\s*Auditoria: {[\s\S]*?},\n/g);
        // Quitar queries enteras (forma simple)
        removeFromFile(resolversPath, /\s*\/\/ Queries de auditoría[\s\S]*?},\n\s*Mutation:/g, '\n  Mutation:');
        // Quitar llamadas al método registrar() dentro de login/logout/registro
        removeFromFile(resolversPath, /\s*\/\/ 4\. Registrar evento de auditoría[\s\S]*?ipAddress\n\s*}\);\n/g);
        removeFromFile(resolversPath, /\s*\/\/ Registrar intento fallido de login[\s\S]*?ipAddress\n\s*}\);\n/g);
        removeFromFile(resolversPath, /\s*\/\/ Registrar login exitoso[\s\S]*?ipAddress\n\s*}\);\n/g);
        removeFromFile(resolversPath, /\s*\/\/ Registrar logout[\s\S]*?ipAddress\n\s*}\);\n/g);
        removeFromFile(resolversPath, /\s*const ipAddress = context\.req \? .*? 'desconocida';\n/g);
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: Auditoría.`);
    }

    // =========================================================================
    // REGLA 2: REGISTRO ABIERTO (CA-007)
    // =========================================================================
    if (!features.registroAbierto) {
        console.log(`  ➔ ✂️ Poda detectada: Registro Cerrado. Eliminando pantallas de frontend...`);
        
        // 1. Eliminar toda la carpeta de la página de registro
        const registroPath = path.join(destFrontend, 'src', 'app', 'pages', 'registro');
        if (fs.existsSync(registroPath)) {
            fs.rmSync(registroPath, { recursive: true, force: true });
        }
        
        // 2. Limpiar ruta en app.routes.ts
        const routesPath = path.join(destFrontend, 'src', 'app', 'app.routes.ts');
        removeFromFile(routesPath, /,\n\s*{\n\s*path: 'registro',[\s\S]*?}/g);
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: Componente de Registro Abierto.`);
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

    console.log(`\n🎉 ¡PROYECTO ENSAMBLADO Y PODADO CON ÉXITO!`);
    console.log(`========================================================`);
    console.log(`Siguientes pasos:`);
    console.log(`1. cd ../${projectName}/backend`);
    console.log(`2. npm install`);
    console.log(`3. npm run dev`);
    console.log(`\n¡Gracias por usar la Fábrica de Software Académico!\n`);

} catch (err) {
    console.error("❌ Ocurrió un error al ensamblar el proyecto:", err);
}

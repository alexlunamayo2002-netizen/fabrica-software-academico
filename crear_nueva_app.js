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

// 3. Función para copiar directorios recursivamente (ignorando node_modules y .git)
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        // Ignorar carpetas pesadas o innecesarias
        if (src.includes('node_modules') || src.includes('.git') || src.includes('.angular')) return;
        
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(function(childItemName) {
            copyRecursiveSync(path.join(src, childItemName),
                              path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

try {
    // Verificar si el directorio ya existe
    if (fs.existsSync(targetDir)) {
        console.error(`❌ Error: El directorio ${targetDir} ya existe. Elige otro nombre.`);
        process.exit(1);
    }

    console.log(`\n📦 1. Extrayendo Core Assets (Frontend y Backend)...`);
    fs.mkdirSync(targetDir);
    
    const srcFrontend = path.join(__dirname, config.fabrica.rutas_core_assets.frontend);
    const srcBackend = path.join(__dirname, config.fabrica.rutas_core_assets.backend);
    
    const destFrontend = path.join(targetDir, 'frontend');
    const destBackend = path.join(targetDir, 'backend');

    copyRecursiveSync(srcFrontend, destFrontend);
    copyRecursiveSync(srcBackend, destBackend);
    
    console.log(`✅ Core Assets copiados exitosamente.`);

    console.log(`\n🎛️  2. Aplicando Variabilidad (Feature Toggles)...`);
    const features = config.configuracion_nuevo_proyecto.features;
    console.log(`  - Auditoría Activa: ${features.usarAuditoria}`);
    console.log(`  - Roles Habilitados: ${features.roles.join(', ')}`);
    console.log(`  - Registro Abierto: ${features.registroAbierto}`);
    
    // Inyectar configuración base en un .env nuevo para el proyecto
    console.log(`\n⚙️  3. Generando configuración de entorno base...`);
    const envContent = `DB_HOST=${config.configuracion_nuevo_proyecto.entorno.db_host_template}
DB_PORT=5432
DB_NAME=bd_${projectName.toLowerCase()}
DB_USER=root
DB_PASSWORD=secret
JWT_SECRET=generar_nuevo_secreto_aqui
PORT=${config.configuracion_nuevo_proyecto.entorno.puerto_backend}
`;
    fs.writeFileSync(path.join(destBackend, '.env'), envContent);
    console.log(`✅ Archivo .env generado.`);

    console.log(`\n🎉 ¡PROYECTO ENSAMBLADO CON ÉXITO!`);
    console.log(`========================================================`);
    console.log(`Siguientes pasos:`);
    console.log(`1. cd ../${projectName}/backend`);
    console.log(`2. npm install`);
    console.log(`3. Configura tu BD real en el .env`);
    console.log(`4. npm run dev`);
    console.log(`\n¡Gracias por usar la Fábrica de Software Académico!\n`);

} catch (err) {
    console.error("❌ Ocurrió un error al ensamblar el proyecto:", err);
}

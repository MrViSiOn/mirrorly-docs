const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Script para empaquetar el plugin WordPress en un archivo .zip
 * para distribución en WordPress.org o instalación manual
 */

const PLUGIN_DIR = path.join(__dirname, '..', 'mirrorly');
const BUILD_DIR = path.join(__dirname, '..', 'build');
const OUTPUT_FILE = path.join(BUILD_DIR, 'mirrorly.zip');

// Archivos y directorios a incluir en el paquete
const INCLUDE_PATTERNS = [
  'mirrorly.php',
  'includes/**/*',
  'assets/dist/**/*',
  'templates/**/*',
  'languages/**/*',
  'readme.txt',
  'LICENSE'
];

// Archivos y directorios a excluir
const EXCLUDE_PATTERNS = [
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/*.log',
  '**/node_modules/**',
  '**/src/**',
  '**/.git/**',
  '**/.gitignore',
  '**/package.json',
  '**/webpack.config.js',
  '**/composer.json',
  '**/phpunit.xml'
];

async function createPackage() {
  try {
    // Crear directorio build si no existe
    if (!fs.existsSync(BUILD_DIR)) {
      fs.mkdirSync(BUILD_DIR, { recursive: true });
    }

    // Crear archivo zip
    const output = fs.createWriteStream(OUTPUT_FILE);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Máxima compresión
    });

    // Manejar eventos
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Plugin empaquetado exitosamente:`);
      console.log(`   📦 Archivo: ${OUTPUT_FILE}`);
      console.log(`   📊 Tamaño: ${sizeInMB} MB`);
      console.log(`   📁 Archivos: ${archive.pointer()} bytes`);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️  Advertencia:', err.message);
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
      throw err;
    });

    // Conectar archive al output
    archive.pipe(output);

    // Función para verificar si un archivo debe ser excluido
    const shouldExclude = (filePath) => {
      return EXCLUDE_PATTERNS.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(filePath);
      });
    };

    // Función recursiva para agregar archivos
    const addDirectory = (dirPath, basePath = '') => {
      const items = fs.readdirSync(dirPath);

      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const relativePath = path.join(basePath, item);

        if (shouldExclude(relativePath)) {
          console.log(`⏭️  Excluyendo: ${relativePath}`);
          return;
        }

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          addDirectory(fullPath, relativePath);
        } else {
          archive.file(fullPath, { name: `mirrorly/${relativePath}` });
          console.log(`📄 Agregando: ${relativePath}`);
        }
      });
    };

    console.log('🚀 Iniciando empaquetado del plugin...');
    console.log(`📂 Directorio fuente: ${PLUGIN_DIR}`);

    // Verificar que el directorio del plugin existe
    if (!fs.existsSync(PLUGIN_DIR)) {
      throw new Error(`El directorio del plugin no existe: ${PLUGIN_DIR}`);
    }

    // Agregar todos los archivos del plugin
    addDirectory(PLUGIN_DIR);

    // Finalizar el archivo
    await archive.finalize();

  } catch (error) {
    console.error('❌ Error al empaquetar el plugin:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createPackage();
}

module.exports = { createPackage };
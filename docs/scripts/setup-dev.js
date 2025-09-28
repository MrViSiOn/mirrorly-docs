#!/usr/bin/env node

/**
 * Script de configuración inicial para desarrollo
 * Instala dependencias y configura el entorno de desarrollo
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

function runCommand(command, args, cwd, label) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 [${label}] Ejecutando: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ [${label}] Completado exitosamente\n`);
        resolve(code);
      } else {
        console.error(`❌ [${label}] Falló con código ${code}\n`);
        reject(new Error(`${label} failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ [${label}] Error: ${error.message}`);
      reject(error);
    });
  });
}

function copyEnvFile(source, target, label) {
  try {
    if (!fs.existsSync(target)) {
      fs.copyFileSync(source, target);
      console.log(`✅ [${label}] Archivo .env creado: ${target}`);
    } else {
      console.log(`ℹ️  [${label}] Archivo .env ya existe: ${target}`);
    }
  } catch (error) {
    console.error(`❌ [${label}] Error copiando .env: ${error.message}`);
  }
}

async function setupDevelopment() {
  try {
    console.log('🛠️  Configurando entorno de desarrollo...\n');

    // 1. Instalar dependencias del root
    console.log('📦 Instalando dependencias del workspace root...');
    await runCommand('npm', ['install'], ROOT_DIR, 'Root');

    // 2. Instalar dependencias de la API
    console.log('📦 Instalando dependencias de la API...');
    await runCommand('npm', ['install'], path.join(ROOT_DIR, 'api'), 'API');

    // 3. Instalar dependencias del plugin
    console.log('📦 Instalando dependencias del plugin...');
    await runCommand('npm', ['install'], path.join(ROOT_DIR, 'wordpress-plugin'), 'Plugin');

    // 4. Copiar archivos .env de ejemplo
    console.log('⚙️  Configurando archivos de entorno...');
    copyEnvFile(
      path.join(ROOT_DIR, 'api', '.env.example'),
      path.join(ROOT_DIR, 'api', '.env'),
      'API'
    );

    // 5. Crear directorios necesarios
    console.log('📁 Creando directorios necesarios...');
    const dirsToCreate = [
      path.join(ROOT_DIR, 'api', 'logs'),
      path.join(ROOT_DIR, 'api', 'uploads'),
      path.join(ROOT_DIR, 'api', 'temp'),
      path.join(ROOT_DIR, 'wordpress-plugin', 'build')
    ];

    dirsToCreate.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Directorio creado: ${dir}`);
      }
    });

    console.log('\n🎉 Configuración de desarrollo completada!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Configurar variables de entorno en api/.env');
    console.log('2. Configurar base de datos MySQL');
    console.log('3. Obtener API key de Google Generative AI');
    console.log('4. Ejecutar: npm run dev:api (para la API)');
    console.log('5. Ejecutar: npm run dev:plugin (para el plugin)');

  } catch (error) {
    console.error('\n💥 Error en la configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupDevelopment();
}

module.exports = { setupDevelopment };
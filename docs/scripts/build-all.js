#!/usr/bin/env node

/**
 * Script para build completo del monorepo
 * Ejecuta build de API y Plugin en paralelo
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

function runCommand(command, args, cwd, label) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 [${label}] Ejecutando: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`📄 [${label}] ${output.trim()}`);
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`❌ [${label}] ${output.trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ [${label}] Completado exitosamente`);
        resolve({ code, stdout, stderr });
      } else {
        console.error(`❌ [${label}] Falló con código ${code}`);
        reject(new Error(`${label} failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ [${label}] Error: ${error.message}`);
      reject(error);
    });
  });
}

async function buildAll() {
  try {
    console.log('🏗️  Iniciando build completo del monorepo...\n');

    // Build en paralelo
    const builds = [
      runCommand('npm', ['run', 'build'], path.join(ROOT_DIR, 'api'), 'API'),
      runCommand('npm', ['run', 'build'], path.join(ROOT_DIR, 'wordpress-plugin'), 'Plugin')
    ];

    await Promise.all(builds);

    console.log('\n🎉 Build completo exitoso!');
    console.log('📦 Componentes construidos:');
    console.log('   - API: dist/');
    console.log('   - Plugin: mirrorly/assets/dist/');

  } catch (error) {
    console.error('\n💥 Error en el build:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  buildAll();
}

module.exports = { buildAll };
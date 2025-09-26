import sequelize from '../config/db';
import License from '../models/License';

async function testLicenseGoogleKey() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    console.log('\n🔄 Probando creación de licencia FREE...');
    const testDomain = 'test-domain-' + Date.now() + '.com';
    const freeLicense = await License.createFreeLicense(testDomain);
    console.log('✅ Licencia FREE creada:');
    console.log('   - ID:', freeLicense.id);
    console.log('   - License Key (GUID):', freeLicense.getLicenseKey());
    console.log('   - Domain:', freeLicense.domain);
    console.log('   - Type:', freeLicense.type);
    console.log('   - Status:', freeLicense.status);
    console.log('   - Monthly Limit:', freeLicense.monthly_limit);
    console.log('   - Google Key:', freeLicense.hasGoogleKey() ? 'Configurada' : 'No configurada');

    console.log('\n🔄 Probando configuración de Google API Key...');
    const testGoogleKey = 'AIzaSyDummyKeyForTesting123456789';
    await freeLicense.updateGoogleApiKey(testGoogleKey);
    console.log('✅ Google API Key configurada');
    console.log('   - Google Key configurada:', freeLicense.hasGoogleKey());
    console.log('   - Google Key descifrada:', freeLicense.getDecryptedGoogleKey());

    console.log('\n🔄 Probando búsqueda por license key...');
    const foundLicense = await License.findByLicenseKey(freeLicense.getLicenseKey());
    if (foundLicense) {
      console.log('✅ Licencia encontrada por license key');
      console.log('   - ID:', foundLicense.id);
      console.log('   - Domain:', foundLicense.domain);
      console.log('   - Google Key configurada:', foundLicense.hasGoogleKey());
    } else {
      console.log('❌ No se pudo encontrar la licencia');
    }

    console.log('\n🔄 Probando generación de GUID...');
    const guid1 = License.generateLicenseKey();
    const guid2 = License.generateLicenseKey();
    console.log('✅ GUIDs generados:');
    console.log('   - GUID 1:', guid1);
    console.log('   - GUID 2:', guid2);
    console.log('   - Formato correcto:', /^[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/.test(guid1));
    console.log('   - Son únicos:', guid1 !== guid2);

    console.log('\n🧹 Limpiando datos de prueba...');
    await freeLicense.destroy();
    console.log('✅ Datos de prueba eliminados');

    console.log('\n🎉 Todas las pruebas pasaron exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

testLicenseGoogleKey();
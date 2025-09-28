# Guía de Desarrollo del Plugin WordPress

## 🚀 Configuración Rápida

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Entorno WordPress
```bash
npm run setup:wordpress
```

Este comando te guiará para:
- Detectar tu instalación de WordPress
- Configurar la sincronización automática
- Elegir el método de desarrollo (enlace simbólico o copia automática)

### 3. Opciones de Desarrollo

#### Opción A: Enlace Simbólico (Recomendado)
```powershell
# Ejecutar PowerShell como administrador
npm run sync:plugin:link

# O ejecutar directamente el script
powershell -ExecutionPolicy Bypass -File scripts/create-symlink-manual.ps1
```

#### Opción B: Sincronización Automática
```bash
npm run sync:plugin
```

## 🔧 Flujo de Desarrollo

### 1. Estructura del Plugin
```
wordpress-plugin/mirrorly/
├── mirrorly.php              # Archivo principal del plugin
├── includes/                 # Clases PHP
│   ├── class-admin.php       # Panel de administración
│   ├── class-frontend.php    # Funcionalidad frontend
│   ├── class-api-client.php  # Cliente API
│   └── ...
├── assets/                   # CSS, JS, imágenes
├── templates/                # Plantillas PHP
└── tests/                    # Tests PHPUnit
```

### 2. Desarrollo Frontend (JavaScript/CSS)
```bash
cd wordpress-plugin
npm run dev    # Modo desarrollo con watch
npm run build  # Build para producción
```

### 3. Testing
```bash
# Tests del plugin
npm run test:plugin

# Tests completos del proyecto
npm test
```

## 🎯 Casos de Uso Comunes

### Modificar Estilos CSS
1. Edita `wordpress-plugin/mirrorly/assets/css/frontend.css`
2. Los cambios se sincronizan automáticamente
3. Recarga la página en WordPress para ver cambios

### Agregar Nueva Funcionalidad PHP
1. Crea/modifica archivos en `wordpress-plugin/mirrorly/includes/`
2. Los cambios se sincronizan automáticamente
3. Puede requerir desactivar/activar el plugin en WordPress

### Modificar JavaScript
1. Edita archivos en `wordpress-plugin/mirrorly/assets/js/`
2. Si usas build process: `cd wordpress-plugin && npm run build`
3. Los cambios se sincronizan automáticamente

### Agregar Nuevas Plantillas
1. Crea archivos en `wordpress-plugin/mirrorly/templates/`
2. Los cambios se sincronizan automáticamente

## 🐛 Debugging

### Habilitar Debug en WordPress
Agrega a `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

### Ver Logs
```bash
# Logs de WordPress
tail -f /ruta/a/wordpress/wp-content/debug.log

# Logs del servidor web (Apache/Nginx)
tail -f /var/log/apache2/error.log
```

### Debug del Plugin
El plugin incluye funciones de debug:
```php
// En cualquier archivo PHP del plugin
error_log('Debug: ' . print_r($variable, true));
```

## 🔄 Comandos Útiles

```bash
# Configuración inicial
npm run setup:wordpress

# Sincronización automática
npm run sync:plugin

# Crear enlace simbólico
npm run sync:plugin:link

# Desarrollo con watch
cd wordpress-plugin && npm run dev

# Build del plugin
npm run build:plugin

# Tests
npm run test:plugin

# Linting
npm run lint:plugin

# Generar release
npm run release:plugin
```

## 📁 Configuración Manual

Si prefieres configurar manualmente:

### 1. Copiar Plugin
```bash
xcopy "wordpress-plugin\mirrorly" "C:\xampp\htdocs\tu-wordpress\wp-content\plugins\mirrorly" /E /I /Y
```

### 2. Enlace Simbólico Manual
```powershell
# En PowerShell como administrador
New-Item -ItemType SymbolicLink -Path "C:\xampp\htdocs\tu-wordpress\wp-content\plugins\mirrorly" -Target "C:\ruta\a\tu\proyecto\wordpress-plugin\mirrorly"

# O usar el script interactivo
powershell -ExecutionPolicy Bypass -File scripts/create-symlink-manual.ps1
```

## 🚨 Troubleshooting

### Plugin No Aparece en WordPress
- Verifica que el archivo `mirrorly.php` esté en la ruta correcta
- Revisa que no haya errores de sintaxis PHP
- Comprueba los logs de error de WordPress

### Cambios No Se Reflejan
- Verifica que la sincronización esté funcionando
- Limpia caché de WordPress si usas plugins de caché
- Recarga la página con Ctrl+F5

### Errores de Permisos
- Ejecuta el terminal como administrador para enlaces simbólicos
- Verifica permisos de escritura en el directorio de plugins

### Problemas con Assets (CSS/JS)
- Ejecuta `npm run build` en el directorio wordpress-plugin
- Verifica que los archivos estén en `assets/css/` y `assets/js/`
- Comprueba que WordPress esté cargando los assets correctamente

## 💡 Tips de Desarrollo

1. **Usa enlaces simbólicos** para desarrollo más eficiente
2. **Habilita WP_DEBUG** siempre durante desarrollo
3. **Usa un entorno local** (XAMPP, WAMP, Local by Flywheel)
4. **Mantén backups** de tu base de datos de pruebas
5. **Prueba en diferentes temas** de WordPress
6. **Verifica compatibilidad** con diferentes versiones de WooCommerce

## 🔗 Enlaces Útiles

- [WordPress Plugin Handbook](https://developer.wordpress.org/plugins/)
- [WooCommerce Developer Docs](https://woocommerce.github.io/code-reference/)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)
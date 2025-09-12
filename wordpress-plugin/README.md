# Mirrorly WordPress Plugin

Plugin para WordPress/WooCommerce que permite a los usuarios visualizarse usando productos mediante inteligencia artificial.

## Características

### Versión FREE
- Hasta 10 generaciones por mes
- Máximo 3 productos habilitados
- Funcionalidad básica de visualización

### Versión PRO
- Generaciones ampliadas según plan
- Productos ilimitados
- Personalización avanzada de estilos
- Selección específica de productos

## Estructura del Plugin

```
mirrorly/
├── mirrorly.php                 # Plugin principal
├── includes/
│   ├── class-mirrorly.php       # Clase principal
│   ├── class-admin.php          # Panel de administración
│   ├── class-frontend.php       # Funcionalidad frontend
│   ├── class-api-client.php     # Cliente para API central
│   ├── class-license.php        # Gestión de licencias
│   └── class-product-meta.php   # Metabox de productos
├── assets/
│   ├── css/                     # Estilos fuente
│   ├── js/                      # JavaScript fuente
│   └── dist/                    # Assets compilados
├── templates/
│   ├── frontend-widget.php      # Widget del producto
│   └── admin-settings.php       # Página de configuración
└── languages/                   # Archivos de traducción
```

## Instalación

### Para Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo con watch mode
npm run dev

# Build para producción
npm run build
```

### Para Producción

1. Descargar el archivo `mirrorly.zip` de la release
2. Subir a WordPress via Admin > Plugins > Añadir nuevo
3. Activar el plugin
4. Configurar API key en Mirrorly > Configuración

## Configuración

### Requisitos

- WordPress >= 5.8
- WooCommerce >= 6.0
- PHP >= 7.4
- API key de la API Mirrorly

### Configuración Inicial

1. **Obtener API Key**: Registrarse en el servicio Mirrorly
2. **Configurar Plugin**:
   - Ir a `Mirrorly > Configuración`
   - Introducir API key
   - Seleccionar tipo de licencia (FREE/PRO)
3. **Habilitar Productos**:
   - Editar productos en WooCommerce
   - Activar Mirrorly en el metabox del producto
   - Seleccionar imagen de referencia

## Uso

### Para Administradores

1. **Panel de Configuración**: `wp-admin > Mirrorly > Configuración`
2. **Configuración por Producto**: En el editor de productos WooCommerce
3. **Personalización PRO**: Colores, estilos y mensajes personalizados

### Para Usuarios Finales

1. Visitar página de producto habilitado
2. Subir imagen personal en el widget Mirrorly
3. Esperar procesamiento (30-60 segundos)
4. Ver resultado y descargar/compartir

## Desarrollo

### Scripts Disponibles

```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Tests PHP
npm run test

# Linting
npm run lint
npm run lint:fix

# Generar release
npm run release
```

### Testing

```bash
# Tests unitarios PHP
./vendor/bin/phpunit

# Tests de integración
npm run test:integration
```

### Estructura de Archivos

- **PHP**: Clases en `includes/`, siguiendo estándares WordPress
- **JavaScript**: Módulos ES6 en `assets/js/`
- **CSS**: Estilos SCSS en `assets/css/`
- **Templates**: Plantillas PHP en `templates/`

## API Integration

El plugin se comunica con la API REST centralizada para:

- Validación de licencias
- Control de límites de uso
- Generación de imágenes con IA
- Gestión de rate limiting

### Endpoints Utilizados

- `POST /auth/validate-license` - Validar licencia
- `POST /generate/image` - Generar imagen
- `GET /limits/current` - Consultar límites

## Hooks y Filtros

### Actions

```php
// Personalizar widget frontend
add_action('mirrorly_before_widget', 'custom_function');
add_action('mirrorly_after_widget', 'custom_function');

// Personalizar proceso de generación
add_action('mirrorly_before_generation', 'custom_function');
add_action('mirrorly_after_generation', 'custom_function');
```

### Filters

```php
// Modificar configuración del widget
add_filter('mirrorly_widget_config', 'custom_config');

// Personalizar mensajes
add_filter('mirrorly_messages', 'custom_messages');

// Modificar límites (solo para desarrollo)
add_filter('mirrorly_limits', 'custom_limits');
```

## Personalización

### Estilos CSS

```css
/* Personalizar widget */
.mirrorly-widget {
    /* Tus estilos aquí */
}

/* Personalizar botones */
.mirrorly-button {
    /* Tus estilos aquí */
}
```

### JavaScript

```javascript
// Eventos personalizados
jQuery(document).on('mirrorly:generation_start', function(e, data) {
    // Tu código aquí
});

jQuery(document).on('mirrorly:generation_complete', function(e, data) {
    // Tu código aquí
});
```

## Troubleshooting

### Problemas Comunes

1. **Error de API Key**: Verificar configuración en panel de admin
2. **Límites Excedidos**: Consultar uso actual en configuración
3. **Imágenes no se procesan**: Verificar conectividad con API
4. **Plugin no aparece**: Verificar compatibilidad con WooCommerce

### Debug Mode

```php
// En wp-config.php
define('MIRRORLY_DEBUG', true);
```

### Logs

Los logs se guardan en `wp-content/debug.log` cuando está habilitado el debug.

## Contribución

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) en el directorio raíz del proyecto.

## Licencia

GPL-2.0-or-later - Compatible con WordPress.
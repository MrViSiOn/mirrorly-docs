# Mirrorly WordPress Plugin

Plugin de WordPress/WooCommerce que permite a los usuarios visualizarse usando productos mediante inteligencia artificial. Integra con la API centralizada de Mirrorly para generar imágenes realistas donde el cliente aparece "usando" o "portando" el producto seleccionado.

## 🚀 Características

- **Versiones FREE y PRO**: Modelo freemium con funcionalidades escalables
- **Integración WooCommerce**: Seamless integration con productos existentes
- **Widget Frontend**: Interfaz intuitiva para subida de imágenes
- **Panel de Administración**: Configuración completa desde wp-admin
- **Personalización Avanzada**: Estilos y colores personalizables (PRO)
- **Rate Limiting**: Control automático de uso según licencia
- **Responsive Design**: Compatible con todos los dispositivos
- **Multiidioma**: Preparado para traducción

## 📋 Requisitos

### WordPress/WooCommerce
- **WordPress** >= 5.8
- **WooCommerce** >= 6.0
- **PHP** >= 7.4 (8.0+ recomendado)
- **MySQL** >= 5.7

### Servidor
- **cURL** habilitado
- **GD Library** o **ImageMagick**
- **file_uploads** habilitado
- **max_file_uploads** >= 20
- **upload_max_filesize** >= 10M
- **post_max_size** >= 10M

### API Externa
- Acceso a la API de Mirrorly
- API Key válida (FREE o PRO)

## 🔧 Instalación

### Instalación Manual

1. **Descargar el plugin**
   ```bash
   # Desde el repositorio
   wget https://github.com/your-org/mirrorly-project/releases/latest/download/mirrorly.zip
   ```

2. **Subir a WordPress**
   - Ir a `Plugins > Añadir nuevo > Subir plugin`
   - Seleccionar el archivo `mirrorly.zip`
   - Hacer clic en "Instalar ahora"
   - Activar el plugin

3. **Configuración inicial**
   - Ir a `Mirrorly > Configuración`
   - Introducir API Key
   - Configurar opciones básicas

### Instalación desde WordPress.org

```bash
# Buscar "Mirrorly" en el directorio de plugins de WordPress
# O instalar desde wp-admin > Plugins > Añadir nuevo
```

### Instalación para Desarrollo

```bash
# Clonar el repositorio completo
git clone https://github.com/your-org/mirrorly-project.git
cd mirrorly-project

# Instalar dependencias
npm install

# Build del plugin
npm run build:plugin

# El plugin estará en wordpress-plugin/build/mirrorly/
```

## ⚙️ Configuración

### 1. Configuración Básica

Después de activar el plugin:

1. **Ir a Mirrorly > Configuración**
2. **Introducir API Key**
   - Para versión FREE: Registrarse en [mirrorly.com/free](https://mirrorly.com/free)
   - Para versión PRO: Adquirir licencia en [mirrorly.com/pro](https://mirrorly.com/pro)
3. **Configurar mensaje personalizado** (opcional)
4. **Guardar cambios**

### 2. Configuración de Productos

Para cada producto que quieras habilitar:

1. **Editar producto en WooCommerce**
2. **Buscar metabox "Mirrorly"**
3. **Activar funcionalidad**
4. **Seleccionar imagen del producto** para usar con IA
5. **Configurar mensaje personalizado** (opcional)
6. **Actualizar producto**

### 3. Configuración PRO (Solo versión PRO)

Funcionalidades adicionales disponibles:

- **Personalización de estilos**: Colores, fuentes, tamaños
- **Selección masiva de productos**: Activar en múltiples productos
- **Mensajes personalizados por producto**
- **Límites extendidos**: Más generaciones por mes
- **Soporte prioritario**

## 🎨 Personalización

### Estilos CSS

El plugin incluye CSS básico que puede ser personalizado:

```css
/* Widget principal */
.mirrorly-widget {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
}

/* Botón de subida */
.mirrorly-upload-btn {
    background: #0073aa;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
}

/* Resultado */
.mirrorly-result {
    text-align: center;
    margin-top: 20px;
}

.mirrorly-result img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
}
```

### Hooks y Filtros

El plugin proporciona varios hooks para personalización:

```php
// Modificar mensaje del widget
add_filter('mirrorly_widget_message', function($message, $product_id) {
    return "¡Prueba cómo te queda este {$product->get_name()}!";
}, 10, 2);

// Personalizar estilos del widget
add_filter('mirrorly_widget_styles', function($styles) {
    $styles['primary_color'] = '#ff6b35';
    return $styles;
});

// Modificar configuración de subida
add_filter('mirrorly_upload_config', function($config) {
    $config['max_file_size'] = 5 * 1024 * 1024; // 5MB
    $config['allowed_types'] = ['jpg', 'jpeg', 'png'];
    return $config;
});

// Acción después de generación exitosa
add_action('mirrorly_generation_success', function($result, $product_id, $user_id) {
    // Enviar email, guardar estadísticas, etc.
}, 10, 3);

// Acción después de error en generación
add_action('mirrorly_generation_error', function($error, $product_id, $user_id) {
    // Log error, notificar admin, etc.
}, 10, 3);
```

## 🔧 Desarrollo

### Estructura de Archivos

```
mirrorly/
├── mirrorly.php                 # Plugin principal
├── includes/
│   ├── class-mirrorly.php       # Clase principal
│   ├── class-admin.php          # Panel de administración
│   ├── class-frontend.php       # Funcionalidad frontend
│   ├── class-api-client.php     # Cliente API
│   ├── class-license.php        # Gestión de licencias
│   └── class-product-meta.php   # Metabox de productos
├── assets/
│   ├── css/
│   │   ├── admin.css           # Estilos admin
│   │   └── frontend.css        # Estilos frontend
│   ├── js/
│   │   ├── admin.js            # JavaScript admin
│   │   └── frontend.js         # JavaScript frontend
│   └── images/                 # Imágenes del plugin
├── templates/
│   ├── admin/
│   │   └── settings-page.php   # Página de configuración
│   └── frontend/
│       └── product-widget.php  # Widget del producto
├── languages/                  # Archivos de traducción
├── tests/                      # Tests PHPUnit
└── README.txt                  # README para WordPress.org
```

### Scripts de Desarrollo

```bash
# Desarrollo con watch mode
npm run dev:plugin

# Build para producción
npm run build:plugin

# Generar archivo .zip para distribución
npm run release:plugin

# Ejecutar tests
npm run test:plugin

# Linting
npm run lint:plugin
```

### Testing

El plugin incluye tests PHPUnit:

```bash
# Ejecutar todos los tests
./vendor/bin/phpunit

# Test específico
./vendor/bin/phpunit tests/test-api-client.php

# Coverage
./vendor/bin/phpunit --coverage-html coverage/
```

## 🚀 Deployment

### Para WordPress.org

```bash
# Generar release
npm run release:plugin

# El archivo mirrorly.zip estará en wordpress-plugin/build/
# Subir a WordPress.org SVN repository
```

### Para Distribución Privada

```bash
# Build del plugin
npm run build:plugin

# Comprimir directorio
cd wordpress-plugin/build
zip -r mirrorly-v1.0.0.zip mirrorly/

# Distribuir archivo .zip
```

## 📊 Límites y Planes

### Versión FREE
- **Productos**: Máximo 3 productos con funcionalidad activa
- **Generaciones**: 10 por mes
- **Rate Limit**: 1 generación cada 60 segundos
- **Soporte**: Comunidad

### Versión PRO Básico
- **Productos**: Ilimitados
- **Generaciones**: 100 por mes
- **Rate Limit**: 1 generación cada 30 segundos
- **Personalización**: Estilos y colores
- **Soporte**: Email

### Versión PRO Premium
- **Productos**: Ilimitados
- **Generaciones**: 500 por mes
- **Rate Limit**: 1 generación cada 15 segundos
- **Personalización**: Completa
- **Soporte**: Prioritario

## 🔍 Troubleshooting

### Problemas Comunes

**1. "API Key inválida"**
- Verificar que la API Key esté correctamente introducida
- Comprobar que no haya espacios extra
- Verificar que la licencia esté activa

**2. "Límite de generaciones excedido"**
- Verificar el plan actual en Mirrorly > Estado
- Esperar al siguiente período de facturación
- Considerar upgrade a plan superior

**3. "Error al subir imagen"**
- Verificar que el archivo sea JPG, JPEG o PNG
- Comprobar que el tamaño sea menor a 10MB
- Verificar permisos de escritura en wp-content/uploads

**4. "Timeout en generación"**
- La generación puede tomar 30-60 segundos
- Verificar conexión a internet
- Comprobar estado de la API en status.mirrorly.com

### Logs y Debugging

```php
// Habilitar debug en wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);

// Los logs estarán en wp-content/debug.log
```

### Soporte

- **Documentación**: [docs.mirrorly.com](https://docs.mirrorly.com)
- **FAQ**: [mirrorly.com/faq](https://mirrorly.com/faq)
- **Soporte**: [support@mirrorly.com](mailto:support@mirrorly.com)
- **GitHub Issues**: [github.com/your-org/mirrorly-project/issues](https://github.com/your-org/mirrorly-project/issues)

## 📄 Licencia

GPL-2.0-or-later - Ver archivo [LICENSE](../LICENSE) para detalles.

## 🤝 Contribución

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) en el directorio raíz del proyecto.

## 📝 Changelog

### v1.0.0
- Lanzamiento inicial
- Integración con Google Generative AI
- Versiones FREE y PRO
- Panel de administración completo
- Widget frontend responsive
- Sistema de rate limiting
- Personalización de estilos (PRO)
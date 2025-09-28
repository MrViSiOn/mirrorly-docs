# Mirrorly Project

Plugin WordPress con inteligencia artificial para visualización de productos en WooCommerce que permite a los usuarios ver cómo se verían usando productos de moda, bisutería y accesorios.

## 🚀 Características Principales

- **Inteligencia Artificial Avanzada**: Integración con Google Generative AI para generación realista de imágenes
- **Versiones FREE y PRO**: Modelo freemium con funcionalidades escalables
- **Integración WooCommerce**: Seamless integration con tiendas existentes
- **Rate Limiting Inteligente**: Control de uso y prevención de abuso
- **API REST Centralizada**: Arquitectura escalable y mantenible
- **Personalización Avanzada**: Estilos y configuraciones personalizables (PRO)

## 📁 Estructura del Proyecto

```
mirrorly-project/
├── api/                          # API Node.js/TypeScript
│   ├── src/
│   │   ├── controllers/          # Controladores REST
│   │   ├── models/              # Modelos de datos (Sequelize)
│   │   ├── services/            # Lógica de negocio
│   │   ├── middleware/          # Middleware personalizado
│   │   ├── routes/              # Definición de rutas
│   │   └── config/              # Configuración de la aplicación
│   ├── tests/                   # Tests unitarios e integración
│   ├── dist/                    # Código compilado
│   ├── uploads/                 # Archivos temporales
│   ├── logs/                    # Logs de la aplicación
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── ecosystem.config.js      # Configuración PM2
├── wordpress-plugin/             # Plugin WordPress
│   ├── mirrorly/
│   │   ├── mirrorly.php         # Archivo principal del plugin
│   │   ├── includes/            # Clases PHP del plugin
│   │   ├── assets/              # CSS, JS, imágenes
│   │   ├── templates/           # Templates PHP
│   │   ├── languages/           # Archivos de traducción
│   │   └── tests/               # Tests PHPUnit
│   ├── build/                   # Plugin empaquetado (.zip)
│   ├── package.json
│   └── webpack.config.js        # Build configuration
├── docs/                        # Documentación compartida
│   ├── ARCHITECTURE.md          # Documentación de arquitectura
│   ├── DEVELOPMENT.md           # Guía de desarrollo
│   ├── API.md                   # Documentación de API endpoints
│   └── USER_GUIDE.md            # Guía de usuario
├── scripts/                     # Scripts de build y deployment
│   ├── build-all.js            # Build completo
│   ├── setup-dev.js            # Setup de desarrollo
│   ├── deploy-api.js           # Deployment de API
│   └── release-plugin.js       # Release del plugin
├── .github/                     # GitHub Actions CI/CD
│   └── workflows/
├── package.json                 # Workspace root
├── docker-compose.yml           # Desarrollo local
└── README.md                    # Documentación principal
```

## 📋 Requisitos del Sistema

### Para Desarrollo
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PHP** >= 7.4
- **Composer** >= 2.0
- **MySQL** >= 5.7 o **MariaDB** >= 10.3
- **Docker** (opcional, para desarrollo containerizado)

### Para Producción
- **Servidor Linux** (Ubuntu 20.04+ recomendado)
- **Node.js** >= 18.0.0 (para API)
- **PM2** (para gestión de procesos)
- **Nginx** (proxy reverso recomendado)
- **SSL Certificate** (requerido para producción)

### WordPress/WooCommerce
- **WordPress** >= 5.8
- **WooCommerce** >= 6.0
- **PHP** >= 7.4 (8.0+ recomendado)
- **MySQL** >= 5.7

### APIs Externas
- **Google Generative AI API Key** (requerida)
- Cuenta de Google Cloud con facturación habilitada

## Instalación y Configuración

### Configuración Inicial

```bash
# Clonar el repositorio
git clone https://github.com/your-org/mirrorly-project.git
cd mirrorly-project

# Instalar dependencias
npm run setup
```

### Desarrollo de la API

```bash
# Desarrollo con hot reload
npm run dev:api

# Build para producción
npm run build:api

# Tests
npm run test:api

# Deployment
npm run deploy:api
```

### Desarrollo del Plugin WordPress

```bash
# Desarrollo con watch mode
npm run dev:plugin

# Build del plugin
npm run build:plugin

# Generar release (.zip)
npm run release:plugin

# Tests
npm run test:plugin
```

### Scripts Disponibles

- `npm run dev:api` - Inicia servidor de desarrollo de la API
- `npm run dev:plugin` - Inicia desarrollo del plugin con watch mode
- `npm run build` - Build completo de ambos componentes
- `npm run test` - Ejecuta todos los tests
- `npm run lint` - Linting de todo el código
- `npm run clean` - Limpia archivos de build y node_modules

## Componentes

### API REST (Node.js/TypeScript)

API centralizada que gestiona:
- Autenticación y licencias
- Rate limiting y control de uso
- Integración con Google Generative AI
- Procesamiento de imágenes

**Tecnologías:**
- Node.js + TypeScript
- Express.js
- Sequelize (MySQL)
- Google Generative AI
- Sharp (procesamiento de imágenes)

### Plugin WordPress

Plugin para WordPress/WooCommerce con:
- Versiones FREE y PRO
- Panel de administración
- Widget frontend para productos
- Integración con WooCommerce

**Tecnologías:**
- PHP 7.4+
- WordPress/WooCommerce APIs
- JavaScript/CSS para frontend

## Configuración de Desarrollo

### Variables de Entorno

Crear archivos `.env` en cada componente:

**API (`api/.env`):**
```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mirrorly_dev
DB_USER=root
DB_PASS=
GOOGLE_AI_API_KEY=your_google_ai_key
JWT_SECRET=your_jwt_secret
```

**Plugin (`wordpress-plugin/.env`):**
```
WP_ENV=development
API_BASE_URL=http://localhost:3000/v1
```

### Base de Datos

La API requiere una base de datos MySQL. Las migraciones se ejecutan automáticamente en el primer inicio.

## Deployment

### API en Producción

```bash
# Build y deployment
npm run deploy:api
```

### Plugin WordPress

```bash
# Generar archivo .zip para distribución
npm run release:plugin
```

El archivo generado estará en `wordpress-plugin/build/mirrorly.zip`

## Testing

```bash
# Tests completos
npm test

# Tests específicos
npm run test:api
npm run test:plugin

# Coverage
npm run test:coverage
```

## Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

GPL-2.0-or-later - Ver archivo [LICENSE](LICENSE) para detalles.

## Soporte

Para soporte técnico y documentación adicional, consultar:
- [Documentación API](api/README.md)
- [Documentación Plugin](wordpress-plugin/README.md)
- [Issues en GitHub](https://github.com/your-org/mirrorly-project/issues)
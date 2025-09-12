# Mirrorly Project

Plugin WordPress con inteligencia artificial para visualización de productos en WooCommerce.

## Estructura del Proyecto

```
mirrorly-project/
├── api/                          # API Node.js/TypeScript
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── wordpress-plugin/             # Plugin WordPress
│   ├── mirrorly/
│   │   ├── mirrorly.php
│   │   ├── includes/
│   │   ├── assets/
│   │   └── templates/
│   └── build/                    # Plugin empaquetado para distribución
├── docs/                         # Documentación compartida
├── scripts/                      # Scripts de build y deployment
└── README.md                     # Documentación principal
```

## Requisitos del Sistema

- Node.js >= 18.0.0
- npm >= 9.0.0
- PHP >= 7.4
- WordPress >= 5.8
- WooCommerce >= 6.0
- MySQL >= 5.7

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
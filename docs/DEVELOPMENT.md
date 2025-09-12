# Guía de Desarrollo - Mirrorly

## Configuración del Entorno

### Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- PHP >= 7.4
- MySQL >= 5.7
- WordPress >= 5.8
- WooCommerce >= 6.0

### Configuración Inicial

```bash
# Clonar repositorio
git clone https://github.com/your-org/mirrorly-project.git
cd mirrorly-project

# Configurar entorno de desarrollo
node scripts/setup-dev.js

# O manualmente:
npm install
cd api && npm install
cd ../wordpress-plugin && npm install
```

### Variables de Entorno

**API (api/.env):**
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_NAME=mirrorly_dev
DB_USER=root
DB_PASS=your_password
GOOGLE_AI_API_KEY=your_google_ai_key
JWT_SECRET=your_jwt_secret
```

**Base de Datos:**
```sql
CREATE DATABASE mirrorly_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Flujo de Desarrollo

### Estructura de Branches

```
main                    # Producción estable
├── develop            # Desarrollo principal
├── feature/xxx        # Nuevas características
├── bugfix/xxx         # Corrección de bugs
└── hotfix/xxx         # Fixes críticos para producción
```

### Workflow Recomendado

1. **Crear Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nueva-funcionalidad
   ```

2. **Desarrollo**
   ```bash
   # API
   npm run dev:api

   # Plugin (en otra terminal)
   npm run dev:plugin
   ```

3. **Testing**
   ```bash
   npm run test
   npm run lint
   ```

4. **Commit y Push**
   ```bash
   git add .
   git commit -m "feat: agregar nueva funcionalidad"
   git push origin feature/nueva-funcionalidad
   ```

5. **Pull Request**
   - Crear PR hacia `develop`
   - Incluir descripción detallada
   - Asegurar que pasan todos los tests

## Desarrollo de la API

### Estructura de Archivos

```
api/src/
├── controllers/        # Lógica de endpoints
├── models/            # Modelos de datos (Sequelize)
├── services/          # Lógica de negocio
├── middleware/        # Middleware de Express
├── routes/            # Definición de rutas
├── config/            # Configuración
├── utils/             # Utilidades
└── app.ts             # Aplicación principal
```

### Comandos de Desarrollo

```bash
cd api

# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Tests
npm run test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
npm run lint:fix
```

### Agregar Nuevo Endpoint

1. **Crear Controlador**
   ```typescript
   // src/controllers/NewController.ts
   export class NewController {
     async newMethod(req: Request, res: Response) {
       // Lógica aquí
     }
   }
   ```

2. **Agregar Ruta**
   ```typescript
   // src/routes/new.ts
   import { NewController } from '../controllers/NewController';

   const router = express.Router();
   const controller = new NewController();

   router.post('/endpoint', controller.newMethod);
   ```

3. **Registrar en App**
   ```typescript
   // src/app.ts
   import newRoutes from './routes/new';
   app.use('/api/v1/new', newRoutes);
   ```

### Testing de la API

```typescript
// tests/controllers/NewController.test.ts
describe('NewController', () => {
  test('should handle new endpoint', async () => {
    const response = await request(app)
      .post('/api/v1/new/endpoint')
      .send({ data: 'test' });

    expect(response.status).toBe(200);
  });
});
```

## Desarrollo del Plugin WordPress

### Estructura de Archivos

```
wordpress-plugin/
├── mirrorly/
│   ├── mirrorly.php           # Plugin principal
│   ├── includes/              # Clases PHP
│   ├── assets/               # Assets fuente
│   ├── templates/            # Plantillas PHP
│   └── languages/            # Traducciones
├── assets/                   # Assets de desarrollo
├── build/                    # Plugin empaquetado
└── scripts/                  # Scripts de build
```

### Comandos de Desarrollo

```bash
cd wordpress-plugin

# Desarrollo con watch mode
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

### Agregar Nueva Funcionalidad

1. **Crear Clase PHP**
   ```php
   // mirrorly/includes/class-new-feature.php
   class Mirrorly_New_Feature {
     public function __construct() {
       add_action('init', array($this, 'init'));
     }

     public function init() {
       // Lógica de inicialización
     }
   }
   ```

2. **Registrar en Plugin Principal**
   ```php
   // mirrorly/mirrorly.php
   require_once plugin_dir_path(__FILE__) . 'includes/class-new-feature.php';
   new Mirrorly_New_Feature();
   ```

3. **Agregar Assets si es necesario**
   ```javascript
   // assets/js/new-feature.js
   jQuery(document).ready(function($) {
     // JavaScript para la nueva funcionalidad
   });
   ```

### Testing del Plugin

```php
// tests/test-new-feature.php
class Test_New_Feature extends WP_UnitTestCase {
  public function test_new_functionality() {
    // Test de la nueva funcionalidad
    $this->assertTrue(true);
  }
}
```

## Integración con Google AI

### Configuración

```typescript
// Obtener API key de Google AI Studio
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
```

### Uso del Servicio

```typescript
// src/services/GoogleAIService.ts
export class GoogleAIService {
  async generateImage(userImage: Buffer, productImage: Buffer) {
    // 1. Analizar imágenes y generar prompt
    const prompt = await this.generatePrompt(userImage, productImage);

    // 2. Generar imagen final
    const result = await this.generateFinalImage(userImage, productImage, prompt);

    return result;
  }
}
```

## Debugging

### API Debugging

```typescript
// Usar Winston para logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/debug.log' })
  ]
});

logger.debug('Debug message', { data: someData });
```

### Plugin Debugging

```php
// Habilitar debug en wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('MIRRORLY_DEBUG', true);

// Usar en el plugin
if (defined('MIRRORLY_DEBUG') && MIRRORLY_DEBUG) {
    error_log('Mirrorly Debug: ' . print_r($data, true));
}
```

## Performance

### API Performance

- Usar connection pooling para BD
- Implementar cache con Redis (opcional)
- Optimizar queries con índices
- Comprimir respuestas HTTP

### Plugin Performance

- Lazy loading de assets
- Minificación de CSS/JS
- Cache de respuestas de API
- Optimización de imágenes

## Deployment

### API Deployment

```bash
# Build y deploy
npm run build:api
npm run deploy:api

# Con PM2
pm2 start ecosystem.config.js
pm2 save
```

### Plugin Release

```bash
# Generar release
npm run release:plugin

# El archivo .zip estará en build/mirrorly.zip
```

## Troubleshooting

### Problemas Comunes

1. **Error de conexión a BD**
   - Verificar credenciales en .env
   - Comprobar que MySQL esté ejecutándose

2. **Google AI API errors**
   - Verificar API key válida
   - Comprobar cuotas y límites

3. **Plugin no aparece en WordPress**
   - Verificar estructura de archivos
   - Revisar headers del plugin principal

4. **Assets no se cargan**
   - Ejecutar `npm run build:plugin`
   - Verificar rutas en webpack.config.js

### Logs Útiles

```bash
# API logs
tail -f api/logs/app.log

# WordPress logs
tail -f wp-content/debug.log

# PM2 logs
pm2 logs mirrorly-api
```
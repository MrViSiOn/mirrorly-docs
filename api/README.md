# Mirrorly API

API REST centralizada para el plugin Mirrorly de WordPress. Gestiona autenticación, licencias, rate limiting e integración con Google Generative AI para generar imágenes realistas donde los usuarios aparecen usando productos de e-commerce.

## 🚀 Características

- **Google Generative AI Integration**: Flujo de dos pasos para generación optimizada
- **Sistema de Licencias**: Gestión completa de licencias FREE y PRO
- **Rate Limiting Avanzado**: Control granular de uso por licencia y tiempo
- **Procesamiento de Imágenes**: Optimización automática con Sharp
- **Logging Completo**: Winston para logging estructurado y monitoreo
- **Seguridad Robusta**: Validación, sanitización y protección contra ataques
- **Performance Optimizada**: Cache, compresión y optimización de queries
- **Escalabilidad**: Arquitectura stateless preparada para múltiples instancias

## Estructura del Proyecto

```
api/
├── src/
│   ├── controllers/          # Controladores de endpoints
│   ├── models/              # Modelos de datos (Sequelize)
│   ├── services/            # Servicios de negocio
│   ├── middleware/          # Middleware de Express
│   ├── routes/              # Definición de rutas
│   ├── config/              # Configuración de la aplicación
│   ├── utils/               # Utilidades y helpers
│   └── app.ts               # Aplicación principal
├── tests/                   # Tests unitarios e integración
├── dist/                    # Código compilado (generado)
├── logs/                    # Archivos de log
├── uploads/                 # Archivos subidos temporalmente
└── temp/                    # Archivos temporales
```

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar variables de entorno
nano .env
```

## ⚙️ Configuración

### Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```bash
# Configuración del servidor
NODE_ENV=development
PORT=3000
HOST=localhost

# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mirrorly_dev
DB_USER=root
DB_PASS=your_password
DB_DIALECT=mysql

# Google Generative AI
GOOGLE_AI_API_KEY=your_google_ai_api_key
GOOGLE_AI_MODEL_TEXT=gemini-1.0-pro
GOOGLE_AI_MODEL_VISION=gemini-1.0-pro-vision
GOOGLE_AI_TIMEOUT=30000
GOOGLE_AI_MAX_RETRIES=3

# Seguridad
JWT_SECRET=your_super_secret_jwt_key_here
ENCRYPTION_KEY=your_32_character_encryption_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
TEMP_PATH=./temp

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Cache
CACHE_TTL=300
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Base de Datos

La API usa MySQL con Sequelize ORM. Las migraciones se ejecutan automáticamente en el primer inicio.

### Configuración de Google Generative AI

La API utiliza Google Generative AI para el procesamiento de imágenes. Es importante configurar correctamente los modelos:

```bash
# Configuración de modelos de Google AI
GOOGLE_AI_MODEL_TEXT=gemini-1.0-pro      # Modelo para generación de texto
GOOGLE_AI_MODEL_VISION=gemini-1.0-pro-vision  # Modelo para análisis de imágenes
GOOGLE_AI_TIMEOUT=30000                  # Timeout en milisegundos
GOOGLE_AI_MAX_RETRIES=3                  # Número máximo de reintentos
```

#### Solución de problemas comunes

- **Error 404**: Si recibes un error 404 al usar el modelo `gemini-1.0-pro-vision`, verifica que estás usando la versión correcta del modelo en las variables de entorno.
- **Timeouts**: Si experimentas timeouts frecuentes, considera aumentar el valor de `GOOGLE_AI_TIMEOUT` y `GOOGLE_AI_MAX_RETRIES`.
- **Errores de autenticación**: Asegúrate de que tu `GOOGLE_AI_API_KEY` es válida y tiene permisos para acceder a los modelos configurados.

```sql
-- Crear base de datos
CREATE DATABASE mirrorly_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario (opcional)
CREATE USER 'mirrorly'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON mirrorly_dev.* TO 'mirrorly'@'localhost';
FLUSH PRIVILEGES;
```

### Google Generative AI Setup

1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar Generative AI API
3. Crear API Key en "Credentials"
4. Configurar facturación (requerida para uso en producción)
5. Agregar la API key al archivo `.env`

## Desarrollo

```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Ejecutar en producción
npm start
```

## Testing

```bash
# Ejecutar tests
npm test

# Tests con watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## API Endpoints

### Autenticación

- `POST /auth/register-free` - Registro versión FREE
- `POST /auth/register-pro` - Registro versión PRO
- `POST /auth/validate-license` - Validar licencia
- `GET /auth/status` - Estado de autenticación

### Generación de Imágenes

- `POST /generate/image` - Generar imagen con IA
- `GET /generate/status/:id` - Estado de generación
- `GET /generate/result/:id` - Resultado de generación

### Gestión de Límites

- `GET /limits/current` - Límites actuales
- `GET /limits/usage` - Uso actual
- `POST /limits/reset` - Reset límites (admin)

## Deployment

### Con PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Deploy
npm run deploy
```

### Con Docker

```bash
# Build imagen
docker build -t mirrorly-api .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env mirrorly-api
```

## Monitoreo

La API incluye logging con Winston y métricas básicas de performance.

```bash
# Ver logs en tiempo real
tail -f logs/app.log

# Monitoreo con PM2
pm2 monit
```

## Seguridad

- Rate limiting por IP y licencia
- Validación de entrada con Joi
- Sanitización de archivos subidos
- CORS configurado
- Headers de seguridad con Helmet

## Contribución

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) en el directorio raíz del proyecto.
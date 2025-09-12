# Mirrorly API

API REST centralizada para el plugin Mirrorly de WordPress. Gestiona autenticación, licencias, rate limiting e integración con Google Generative AI.

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

## Configuración

### Variables de Entorno Requeridas

- `GOOGLE_AI_API_KEY`: API key de Google Generative AI
- `DB_*`: Configuración de base de datos MySQL
- `JWT_SECRET`: Clave secreta para JWT

### Base de Datos

La API usa MySQL con Sequelize ORM. Las migraciones se ejecutan automáticamente.

```sql
CREATE DATABASE mirrorly_dev;
```

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
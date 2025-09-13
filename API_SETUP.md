# Guía de Configuración y Ejecución - API Mirrorly

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL >= 5.7
- Git (opcional)

## 🚀 Configuración Inicial

### 1. Navegación al Directorio de la API

```bash
cd G:\htdocs\gloppayment\app\public\wp-content\plugins\mirrorly\api
```

### 2. Instalación de Dependencias

```bash
npm install
```

### 3. Configuración de Variables de Entorno

Copia el archivo de ejemplo y configúralo:

```bash
copy .env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```env
# Environment
NODE_ENV=development

# Server
PORT=3000
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mirrorly_dev
DB_NAME_TEST=mirrorly_test
DB_USER=root
DB_PASS=tu_password_mysql

# Google Generative AI
GOOGLE_AI_API_KEY=tu_clave_api_google_ai

# JWT
JWT_SECRET=tu_clave_secreta_jwt_aqui
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
TEMP_PATH=./temp

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# CORS
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# Security
BCRYPT_ROUNDS=12
```

### 4. Preparación de la Base de Datos

#### 4.1 Crear Base de Datos (MySQL)

```sql
CREATE DATABASE mirrorly_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE mirrorly_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 4.2 Ejecutar Migraciones

```bash
# Ejecutar todas las migraciones
npm run db:migrate
```

**Migraciones disponibles:**
- `20241213000001-create-licenses.js` - Tabla de licencias
- `20241213000002-create-generations.js` - Tabla de generaciones
- `20241213000003-create-rate-limits.js` - Tabla de límites de tasa

#### 4.3 Ejecutar Seeds (Datos de Prueba) - Opcional

```bash
npm run db:seed
```

#### 4.4 Reset Completo de Base de Datos (Si es necesario)

```bash
npm run db:reset
```

### 5. Crear Directorios Necesarios

```bash
mkdir logs
mkdir uploads
mkdir temp
```

## 🏃‍♂️ Ejecución de la API

### Modo Desarrollo (con hot reload)

```bash
npm run dev
```

### Modo Desarrollo con Debug

```bash
npm run dev:debug
```

### Modo Producción

```bash
# Build del proyecto
npm run build

# Ejecutar en producción
npm start
```

### Con PM2 (Recomendado para Producción)

```bash
# Instalar PM2 globalmente (si no lo tienes)
npm install -g pm2

# Iniciar con PM2
npm run pm2:start

# Ver logs
npm run pm2:logs

# Reiniciar
npm run pm2:restart

# Detener
npm run pm2:stop
```

## 🧪 Ejecución de Tests

### Ejecutar Todos los Tests

```bash
npm test
```

### Ejecutar Tests en Modo Watch

```bash
npm run test:watch
```

### Ejecutar Tests con Coverage

```bash
npm run test:coverage
```

### Tests para CI/CD

```bash
npm run test:ci
```

### Tests Específicos de Modelos

```bash
npm run test:models
```

> **Nota sobre Tests**: Algunos tests pueden fallar inicialmente debido a dependencias de base de datos no configuradas. Esto es normal para el setup inicial. Los tests requieren:
> - Base de datos MySQL funcionando
> - Variables de entorno configuradas
> - Migraciones ejecutadas

## 🔍 Scripts de Verificación y Desarrollo

### Linting del Código

```bash
# Verificar errores de lint
npm run lint

# Corregir errores automáticamente
npm run lint:fix
```

### Type Checking (TypeScript)

```bash
npm run type-check
```

### Build del Proyecto

```bash
npm run build
```

### Limpiar Archivos de Build

```bash
npm run clean
```

## 🐳 Ejecución con Docker (Opcional)

```bash
# Build de la imagen Docker
npm run docker:build

# Ejecutar container
npm run docker:run
```

## 📊 Monitoreo y Health Check

### Health Check Manual

```bash
node healthcheck.js
```

### Verificar Estado del Servidor

```bash
curl http://localhost:3000/health
```

## 🔧 Comandos de Base de Datos Adicionales

### Usar Sequelize CLI Directamente

```bash
# Ver estado de migraciones
npx sequelize-cli db:migrate:status

# Deshacer última migración
npx sequelize-cli db:migrate:undo

# Deshacer todas las migraciones
npx sequelize-cli db:migrate:undo:all

# Crear nueva migración
npx sequelize-cli migration:generate --name nombre-de-la-migracion

# Crear nuevo seed
npx sequelize-cli seed:generate --name nombre-del-seed
```

## 📁 Estructura de Archivos de la API

```
api/
├── src/
│   ├── app.ts                 # Punto de entrada
│   ├── config/
│   │   ├── database.js        # Config Sequelize
│   │   ├── database.ts        # Config TypeScript
│   │   └── index.ts           # Config general
│   ├── controllers/           # Controladores
│   ├── middleware/           # Middlewares
│   ├── models/              # Modelos Sequelize
│   ├── routes/              # Rutas de la API
│   ├── services/            # Servicios de negocio
│   ├── migrations/          # Migraciones DB
│   └── tests/              # Tests unitarios
├── dist/                    # Archivos compilados
├── logs/                    # Archivos de log
├── uploads/                 # Archivos subidos
├── temp/                    # Archivos temporales
└── .env                     # Variables de entorno
```

## 🚨 Solución de Problemas Comunes

### Error de Conexión a MySQL

1. Verificar que MySQL esté ejecutándose
2. Verificar credenciales en `.env`
3. Verificar que las bases de datos existan

### Error de Permisos en Windows

Ejecutar terminal como administrador o ajustar permisos de carpeta.

### Puerto en Uso

Cambiar `PORT` en el archivo `.env` o terminar el proceso que usa el puerto 3000:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Cambiar puerto en .env
PORT=3001
```

### Problemas con TypeScript

```bash
# Limpiar y reinstalar
npm run clean
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install
```

#### Solución de Compatibilidad TypeScript/ESLint

Si encuentras errores de compatibilidad entre TypeScript y ESLint:

1. **Actualizar dependencias de ESLint**:
```bash
npm install --save-dev @typescript-eslint/eslint-plugin@^7.18.0 @typescript-eslint/parser@^7.18.0
```

2. **Mantener TypeScript actualizado**:
```bash
npm install --save-dev typescript@^5.9.2
```

3. **Configuración ESLint permisiva** (ya aplicada en `.eslintrc.js`):
   - Warnings en lugar de errors para variables no usadas
   - Configuración permisiva para archivos de scripts y tests
   - Solo errores críticos que rompen el código

## 📚 Comandos de Resumen

```bash
# Setup inicial completo
npm install
copy .env.example .env
# [Editar .env con tus configuraciones]
npm run db:migrate
mkdir logs uploads temp

# Desarrollo diario
npm run dev

# Testing
npm test
npm run test:coverage

# Producción
npm run build
npm start
# o con PM2:
npm run pm2:start
```
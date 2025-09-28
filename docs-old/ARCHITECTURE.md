# Arquitectura del Sistema Mirrorly

## Visión General

Mirrorly es un sistema distribuido que consta de tres componentes principales:

1. **Plugin WordPress** - Interfaz de usuario y administración
2. **API REST Centralizada** - Lógica de negocio y proxy a servicios externos
3. **Google Generative AI** - Servicio de generación de imágenes con IA

## Diagrama de Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WordPress     │    │   API Central   │    │  Google Gen AI  │
│     Plugin      │◄──►│   (Node.js)     │◄──►│    Service      │
│                 │    │                 │    │                 │
│ • Frontend UI   │    │ • Auth & Limits │    │ • Image Gen     │
│ • Admin Panel   │    │ • Rate Limiting │    │ • Vision Models │
│ • WooCommerce   │    │ • Image Proxy   │    │ • Text Models   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│    WordPress    │    │     MySQL       │
│    Database     │    │   Database      │
│                 │    │                 │
│ • Plugin Config │    │ • Licenses      │
│ • Product Meta  │    │ • Usage Stats   │
│ • User Data     │    │ • Rate Limits   │
└─────────────────┘    └─────────────────┘
```

## Flujo de Datos

### Generación de Imagen

1. **Usuario** sube imagen en producto WooCommerce
2. **Plugin** valida imagen y envía a API Central
3. **API Central** verifica licencia y límites
4. **API Central** procesa imagen y llama a Google AI
5. **Google AI** genera imagen combinada
6. **API Central** devuelve resultado al Plugin
7. **Plugin** muestra imagen al usuario

### Autenticación y Licencias

1. **Admin** configura API key en plugin
2. **Plugin** registra dominio en API Central
3. **API Central** valida y almacena licencia
4. **Plugin** consulta límites antes de cada generación

## Componentes Detallados

### Plugin WordPress

**Responsabilidades:**
- Interfaz de usuario frontend
- Panel de administración
- Integración con WooCommerce
- Gestión de configuración local
- Comunicación con API Central

**Tecnologías:**
- PHP 7.4+
- WordPress/WooCommerce APIs
- JavaScript/CSS para frontend
- AJAX para comunicación asíncrona

### API REST Centralizada

**Responsabilidades:**
- Autenticación y autorización
- Gestión de licencias y límites
- Rate limiting y prevención de abuso
- Proxy a Google Generative AI
- Procesamiento de imágenes
- Logging y monitoreo

**Tecnologías:**
- Node.js + TypeScript
- Express.js framework
- Sequelize ORM (MySQL)
- Google Generative AI SDK
- Sharp para procesamiento de imágenes
- Winston para logging

### Base de Datos

**Esquema Principal:**
- `licenses` - Información de licencias y dominios
- `generations` - Historial de generaciones
- `rate_limits` - Control de límites por usuario
- `usage_stats` - Estadísticas de uso

## Patrones de Diseño

### API Gateway Pattern
La API Central actúa como gateway entre el plugin y Google AI, proporcionando:
- Autenticación unificada
- Rate limiting centralizado
- Transformación de datos
- Manejo de errores consistente

### Repository Pattern
Separación entre lógica de negocio y acceso a datos:
- Modelos Sequelize para entidades
- Servicios para lógica de negocio
- Controladores para endpoints HTTP

### Middleware Pattern
Procesamiento de requests en capas:
- Autenticación
- Rate limiting
- Validación de entrada
- Logging
- Manejo de errores

## Consideraciones de Seguridad

### Autenticación
- API keys únicas por dominio
- Validación de dominio en cada request
- JWT para sesiones internas (si necesario)

### Autorización
- Verificación de licencia antes de cada operación
- Límites por tipo de licencia (FREE/PRO)
- Rate limiting por IP y usuario

### Datos Sensibles
- Encriptación de API keys en BD
- Eliminación automática de imágenes temporales
- No logging de información personal
- HTTPS obligatorio en producción

## Escalabilidad

### Horizontal Scaling
- API stateless para múltiples instancias
- Load balancer para distribución de carga
- Base de datos con replicación

### Performance
- Cache de respuestas frecuentes
- Optimización de imágenes antes de procesamiento
- Connection pooling para BD
- CDN para assets estáticos

### Monitoreo
- Métricas de performance (response time, throughput)
- Alertas por errores críticos
- Logging estructurado para debugging
- Dashboard de uso y estadísticas

## Deployment

### Entornos

**Desarrollo:**
- API en localhost:3000
- Plugin en WordPress local
- Base de datos MySQL local

**Staging:**
- API en servidor de pruebas
- Plugin en WordPress de staging
- Base de datos compartida con producción (solo lectura)

**Producción:**
- API en servidor dedicado con PM2
- Plugin distribuido via WordPress.org
- Base de datos MySQL con backups automáticos

### CI/CD Pipeline

1. **Desarrollo** → Push a feature branch
2. **Testing** → Tests automáticos (unit + integration)
3. **Staging** → Deploy automático para QA
4. **Producción** → Deploy manual tras aprobación
5. **Monitoreo** → Alertas y métricas post-deploy
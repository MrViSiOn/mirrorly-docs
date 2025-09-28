# Guía de Usuario - Mirrorly

Guía completa para usuarios finales del plugin Mirrorly. Aprende cómo usar la funcionalidad de visualización con inteligencia artificial para ver cómo te quedan los productos antes de comprarlos.

## 🎯 ¿Qué es Mirrorly?

Mirrorly es un plugin de WordPress que permite a los clientes de tiendas online **visualizarse usando productos** antes de comprarlos. Utilizando inteligencia artificial avanzada, genera imágenes realistas donde el cliente aparece "portando" o "usando" el producto seleccionado.

### Productos Compatibles
- **Ropa y moda**: Camisetas, vestidos, chaquetas, pantalones
- **Accesorios**: Sombreros, gafas, bufandas, cinturones
- **Bisutería**: Collares, pulseras, pendientes, anillos
- **Calzado**: Zapatos, botas, zapatillas (vista parcial)

## 🚀 Cómo Usar Mirrorly

### Para Clientes de la Tienda

#### 1. Encontrar Productos Compatibles

Los productos que tienen Mirrorly habilitado mostrarán:
- **Widget de Mirrorly** en la página del producto
- **Mensaje personalizado** como "¡Prueba cómo te queda!"
- **Botón "Subir tu foto"** o similar

#### 2. Subir tu Foto

1. **Hacer clic en "Subir tu foto"**
2. **Seleccionar imagen desde tu dispositivo**
   - Formatos aceptados: JPG, JPEG, PNG
   - Tamaño máximo: 10MB
   - Recomendación: Foto clara, buena iluminación, fondo simple
3. **Esperar confirmación de subida**

#### 3. Generar Visualización

1. **Hacer clic en "Generar visualización"**
2. **Esperar procesamiento** (30-60 segundos)
   - Se mostrará un indicador de progreso
   - No cerrar la página durante el proceso
3. **Ver resultado**
   - La imagen generada aparecerá automáticamente
   - Podrás descargar o compartir el resultado

#### 4. Consejos para Mejores Resultados

**Foto del Usuario:**
- ✅ Buena iluminación natural
- ✅ Fondo simple y claro
- ✅ Postura frontal o ligeramente ladeada
- ✅ Ropa que no compita con el producto
- ❌ Fotos muy oscuras o borrosas
- ❌ Fondos muy complejos o distractores
- ❌ Múltiples personas en la imagen

**Productos que Funcionan Mejor:**
- ✅ Productos con formas definidas
- ✅ Colores sólidos o patrones simples
- ✅ Buena calidad de imagen del producto
- ❌ Productos muy pequeños o detallados
- ❌ Imágenes de producto de baja calidad

### Para Administradores de Tienda

#### 1. Configuración Inicial

**Después de instalar el plugin:**

1. **Ir a `Mirrorly > Configuración`**
2. **Introducir API Key**
   - FREE: Registrarse en mirrorly.com/free
   - PRO: Adquirir licencia en mirrorly.com/pro
3. **Configurar mensaje global** (opcional)
4. **Guardar cambios**

#### 2. Habilitar en Productos

**Para cada producto:**

1. **Editar producto en WooCommerce**
2. **Buscar sección "Mirrorly"**
3. **Activar "Habilitar Mirrorly"**
4. **Seleccionar imagen principal** del producto
5. **Personalizar mensaje** (opcional)
6. **Actualizar producto**

#### 3. Configuración Avanzada (PRO)

**Personalización de Estilos:**
- Colores del widget
- Fuentes y tamaños
- Mensajes personalizados por producto
- Posición del widget

**Gestión Masiva:**
- Activar/desactivar en múltiples productos
- Configuración por categorías
- Importar/exportar configuraciones

## 📊 Planes y Límites

### Versión FREE

**Características:**
- ✅ Hasta 3 productos con Mirrorly
- ✅ 10 generaciones por mes
- ✅ Funcionalidad básica completa
- ✅ Soporte por comunidad

**Límites:**
- 1 generación cada 60 segundos
- Máximo 3 productos activos
- Sin personalización de estilos

### Versión PRO Básico

**Características:**
- ✅ Productos ilimitados
- ✅ 100 generaciones por mes
- ✅ Personalización básica de estilos
- ✅ Soporte por email

**Límites:**
- 1 generación cada 30 segundos
- Personalización limitada

### Versión PRO Premium

**Características:**
- ✅ Productos ilimitados
- ✅ 500 generaciones por mes
- ✅ Personalización completa
- ✅ Soporte prioritario
- ✅ Funciones avanzadas

**Límites:**
- 1 generación cada 15 segundos
- Sin restricciones de personalización

## 🎨 Personalización

### Estilos Básicos (PRO)

**Colores:**
- Color principal del widget
- Color de botones
- Color de texto
- Color de fondo

**Tipografía:**
- Fuente del texto
- Tamaño de fuente
- Peso de fuente

**Espaciado:**
- Márgenes del widget
- Padding interno
- Separación entre elementos

### Mensajes Personalizados

**Mensaje Global:**
Aplicado a todos los productos que no tengan mensaje específico.

Ejemplo: *"¡Descubre cómo te queda antes de comprar!"*

**Mensaje por Producto:**
Específico para cada producto individual.

Ejemplos:
- Camiseta: *"¡Prueba esta camiseta y ve cómo te sienta!"*
- Collar: *"¿Te gusta cómo se ve este collar en ti?"*
- Gafas: *"Descubre si estas gafas van con tu estilo"*

### Posicionamiento del Widget

**Opciones disponibles:**
- Antes de la descripción del producto
- Después de la descripción del producto
- En la sidebar del producto
- Posición personalizada (con shortcode)

**Shortcode manual:**
```php
[mirrorly_widget product_id="123"]
```

## 🔧 Solución de Problemas

### Problemas Comunes para Usuarios

**1. "No puedo subir mi foto"**

*Posibles causas:*
- Archivo muy grande (>10MB)
- Formato no compatible (usar JPG, JPEG, PNG)
- Conexión a internet lenta

*Soluciones:*
- Reducir tamaño de imagen
- Convertir a formato compatible
- Verificar conexión a internet

**2. "La generación tarda mucho"**

*Tiempo normal:* 30-60 segundos

*Si tarda más:*
- Verificar conexión a internet
- Recargar la página y intentar de nuevo
- Contactar soporte si persiste

**3. "El resultado no se ve bien"**

*Posibles causas:*
- Foto de usuario de baja calidad
- Producto no compatible
- Iluminación deficiente en la foto

*Soluciones:*
- Usar foto con mejor iluminación
- Probar con fondo más simple
- Verificar que el producto sea compatible

### Problemas para Administradores

**1. "API Key inválida"**

*Verificar:*
- API Key correctamente copiada (sin espacios)
- Licencia activa y no vencida
- Conexión del servidor a internet

**2. "Widget no aparece en productos"**

*Verificar:*
- Plugin activado
- Mirrorly habilitado en el producto específico
- Tema compatible con WooCommerce
- No hay conflictos con otros plugins

**3. "Límites excedidos"**

*Soluciones:*
- Verificar plan actual en Mirrorly > Estado
- Esperar renovación mensual
- Considerar upgrade de plan
- Contactar soporte para casos especiales

## 📈 Mejores Prácticas

### Para Tiendas Online

**Selección de Productos:**
- Priorizar productos de mayor venta
- Enfocarse en productos donde la visualización aporta valor
- Evitar productos muy técnicos o complejos

**Optimización de Imágenes:**
- Usar imágenes de producto de alta calidad
- Fondo blanco o neutro preferible
- Buena iluminación y definición

**Mensajes Efectivos:**
- Usar llamadas a la acción claras
- Personalizar por tipo de producto
- Mantener tono de marca consistente

### Para Usuarios Finales

**Preparación de Fotos:**
- Tomar foto con buena luz natural
- Usar fondo simple y claro
- Postura natural y relajada
- Evitar accesorios que compitan con el producto

**Uso Eficiente:**
- Probar con productos que realmente interesan
- Guardar resultados favoritos
- Compartir con amigos para segunda opinión

## 📞 Soporte y Recursos

### Documentación
- **Guía completa**: [docs.mirrorly.com](https://docs.mirrorly.com)
- **FAQ**: [mirrorly.com/faq](https://mirrorly.com/faq)
- **Tutoriales en video**: [youtube.com/mirrorly](https://youtube.com/mirrorly)

### Soporte Técnico
- **Email**: [support@mirrorly.com](mailto:support@mirrorly.com)
- **Chat en vivo**: Disponible en mirrorly.com (PRO)
- **Foro de comunidad**: [community.mirrorly.com](https://community.mirrorly.com)

### Estado del Servicio
- **Estado de API**: [status.mirrorly.com](https://status.mirrorly.com)
- **Mantenimientos programados**: Notificados por email
- **Actualizaciones**: [blog.mirrorly.com](https://blog.mirrorly.com)

## 🔄 Actualizaciones y Changelog

### Cómo Actualizar

**Automático (recomendado):**
- Las actualizaciones aparecen en wp-admin > Plugins
- Hacer clic en "Actualizar ahora"
- Verificar funcionamiento después de actualizar

**Manual:**
- Descargar nueva versión
- Desactivar plugin actual
- Subir nueva versión
- Reactivar plugin

### Historial de Versiones

**v1.0.0** - Lanzamiento inicial
- Integración con Google Generative AI
- Versiones FREE y PRO
- Panel de administración completo
- Widget frontend responsive

**Próximas funcionalidades:**
- Integración con más plataformas de IA
- Soporte para más tipos de productos
- Análisis y estadísticas avanzadas
- Integración con redes sociales

---

*¿Necesitas ayuda adicional? Contacta nuestro equipo de soporte en [support@mirrorly.com](mailto:support@mirrorly.com)*
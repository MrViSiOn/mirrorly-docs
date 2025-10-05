---
title: Guía de Usuario
layout: default
nav_order: 3
description: "Aprende cómo usar Mirrorly para visualizar productos con inteligencia artificial"
---

# Guía de Usuario
{: .no_toc }

Aprende cómo usar la funcionalidad de visualización con inteligencia artificial para ver cómo te quedan los productos antes de comprarlos.
{: .fs-6 .fw-300 }

## Tabla de contenidos
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## 🎯 ¿Qué es Mirrorly?

Mirrorly es un plugin de WordPress que permite a los clientes de tiendas online **visualizarse usando productos** antes de comprarlos. Utilizando inteligencia artificial avanzada, genera imágenes realistas donde el cliente aparece "portando" o "usando" el producto seleccionado.

### Productos Compatibles

**👕 Ropa y moda**
- Camisetas, vestidos, chaquetas, pantalones
- Funciona mejor con prendas de colores sólidos

**👓 Accesorios**
- Sombreros, gafas, bufandas, cinturones
- Excelente para accesorios que se "ponen" sobre la persona

**💍 Bisutería**
- Collares, pulseras, pendientes, anillos
- Ideal para joyería visible y de tamaño medio

**👟 Calzado**
- Zapatos, botas, zapatillas (vista parcial)
- Funcionalidad limitada pero útil para visualización general

---

## 🚀 Para Clientes de la Tienda

### Paso 1: Encontrar Productos Compatibles

Los productos que tienen Mirrorly habilitado mostrarán:

- **Widget de Mirrorly** en la página del producto
- **Mensaje personalizado** como "¡Prueba cómo te queda!"
- **Botón "Subir tu foto"** o similar



{: .highlight }
> **💡 Consejo**: Busca el logo de Mirrorly o mensajes como "Pruébatelo virtualmente" en las fichas de producto.

### Paso 2: Subir tu Foto

1. **Hacer clic en "Subir tu foto"**
2. **Seleccionar imagen desde tu dispositivo**
   - **Formatos aceptados**: JPG, JPEG, PNG
   - **Tamaño máximo**: 10MB
   - **Recomendación**: Foto clara, buena iluminación, fondo simple
3. **Esperar confirmación de subida**

### Paso 3: Generar Visualización

1. **Hacer clic en "Generar visualización"**
2. **Esperar procesamiento** (30-60 segundos)
   - Se mostrará un indicador de progreso
   - No cerrar la página durante el proceso
3. **Ver resultado**
   - La imagen generada aparecerá automáticamente
   - Podrás descargar o compartir el resultado

---

## 📸 Consejos para Mejores Resultados

### Para tu Foto Personal

| ✅ Recomendado | ❌ Evitar |
|:---------------|:----------|
| Buena iluminación natural | Fotos muy oscuras o borrosas |
| Fondo simple y claro | Fondos muy complejos |
| Postura frontal o ligeramente ladeada | Múltiples personas en la imagen |
| Ropa que no compita con el producto | Ropa muy llamativa o con patrones |
| Expresión natural y relajada | Poses muy extremas |

### Para Mejores Resultados con Productos

| ✅ Funciona Mejor | ❌ Limitaciones |
|:------------------|:----------------|
| Productos con formas definidas | Productos muy pequeños o detallados |
| Colores sólidos o patrones simples | Imágenes de producto de baja calidad |
| Buena calidad de imagen del producto | Productos transparentes o muy brillantes |
| Accesorios de tamaño medio-grande | Productos con muchos detalles finos |

---

## 🛍️ Para Administradores de Tienda

### Configuración Inicial

Después de instalar el plugin:

1. **Ir a `Mirrorly > Configuración`** en el panel de WordPress
2. **Introducir API Key** de Google AI Studio
   - [📖 Sigue nuestra guía para obtener tu API Key]({{ site.baseurl }}{% link google-ai-setup.md %})
3. **Configurar mensaje global** (opcional)
4. **Guardar cambios**

### Habilitar en Productos

Para cada producto que quieras habilitar:

1. **Editar producto en WooCommerce**
2. **Buscar sección "Mirrorly"** en la página de edición
3. **Activar "Habilitar Mirrorly"**
4. **Seleccionar imagen principal** del producto para usar con IA
5. **Personalizar mensaje** (opcional)
6. **Actualizar producto**

### Configuración Avanzada (Versión PRO)

**Personalización de Estilos:**
- Colores del widget personalizados
- Fuentes y tamaños adaptados a tu marca
- Mensajes personalizados por producto
- Posición del widget en la página

**Gestión Masiva:**
- Activar/desactivar en múltiples productos
- Configuración por categorías de productos
- Importar/exportar configuraciones

---

## 📊 Planes y Límites

### Versión FREE

- **Productos habilitados**: 3 máximo
- **Generaciones por mes**: 10
- **Velocidad**: 1 generación cada 60 segundos
- **Personalización**: Limitada
- **Soporte**: Documentación online

### Versión PRO

| Plan | Productos | Generaciones/mes | Velocidad | Precio |
|:-----|:----------|:-----------------|:----------|:-------|
| **Básico** | Ilimitados | 100 | 1 cada 30s | €19/mes |
| **Premium** | Ilimitados | 500 | 1 cada 15s | €49/mes |
| **Enterprise** | Ilimitados | 2000 | 1 cada 10s | €99/mes |

---

## 🔧 Solución de Problemas

### "No se puede generar la imagen"

**Posibles causas:**
- API Key no configurada o inválida
- Límite de generaciones alcanzado
- Imagen demasiado grande o formato no soportado

**Solución:**
1. Verifica la configuración del API Key
2. Comprueba los límites de tu plan
3. Reduce el tamaño de la imagen

### "La imagen generada no se ve bien"

**Posibles causas:**
- Foto personal de baja calidad
- Imagen del producto poco clara
- Combinación de colores problemática

**Solución:**
1. Usa una foto con mejor iluminación
2. Prueba con un fondo más simple
3. Verifica que la imagen del producto sea de alta calidad

### "El widget no aparece en mi producto"

**Posibles causas:**
- Mirrorly no está habilitado para ese producto
- Conflicto con el tema de WordPress
- Plugin no activado correctamente

**Solución:**
1. Verifica que Mirrorly esté habilitado en la configuración del producto
2. Comprueba que el plugin esté activado
3. Contacta con soporte si persiste el problema

---

## 🎨 Personalización

### Para Administradores (PRO)

**Colores y Estilos:**
```css
/* Ejemplo de personalización CSS */
.mirrorly-widget {
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.mirrorly-button {
  background-color: #your-brand-color;
  color: white;
}
```

**Mensajes Personalizados:**
- "¡Pruébatelo antes de comprarlo!"
- "Ver cómo me queda"
- "Visualización con IA"
- "Prueba virtual"

<div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
  <h4 style="margin-top: 0; color: #667eea;">💎 Funciones Avanzadas PRO</h4>
  <p>La personalización completa de colores, estilos y mensajes está disponible en la versión PRO, junto con productos ilimitados y más generaciones mensuales.</p>
  <a href="/upgrade-to-pro/" style="color: #667eea; font-weight: bold;">→ Descubre Mirrorly PRO</a>
</div>

---

## 📱 Compatibilidad

### Navegadores Soportados
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

### Dispositivos
- ✅ Desktop/Laptop
- ✅ Tablets
- ✅ Móviles (iOS/Android)

### WordPress
- ✅ WordPress 5.0+
- ✅ WooCommerce 4.0+
- ✅ PHP 7.4+

---

## 🚀 Próximos Pasos

1. **Si eres cliente**: Empieza a probar productos en tiendas que usen Mirrorly
2. **Si eres administrador**:
   - [Configura tu API Key]({{ site.baseurl }}{% link google-ai-setup.md %})
   - Habilita Mirrorly en tus productos más populares
   - Prueba la funcionalidad con diferentes tipos de imágenes

---

## 📞 Soporte y Ayuda

**¿Problemas técnicos?**
- Revisa esta guía completa
- Consulta la [configuración del API Token]({{ site.baseurl }}{% link google-ai-setup.md %})
- Contacta con nuestro equipo de soporte

**¿Sugerencias o feedback?**
Nos encanta escuchar de nuestros usuarios. Comparte tu experiencia y ayúdanos a mejorar Mirrorly.
---
title: Guía del Shortcode
layout: default
nav_order: 4
description: "Aprende cómo usar el shortcode [mirrorly] para insertar el widget en cualquier lugar de tu sitio"
---

# Guía del Shortcode [mirrorly]
{: .no_toc }

Aprende cómo usar el shortcode `[mirrorly]` para insertar el widget de visualización con IA en cualquier lugar de tu sitio web WordPress.
{: .fs-6 .fw-300 }

## Tabla de contenidos
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## 🎯 ¿Qué es el Shortcode Mirrorly?

El shortcode `[mirrorly]` es una herramienta poderosa que permite a **desarrolladores y administradores** insertar el widget de Mirrorly en cualquier lugar del sitio web, no solo en las fichas de producto.

{: .highlight }
> **💡 Ventaja**: Con el shortcode puedes mostrar el widget de un producto específico en páginas personalizadas, widgets de texto, landing pages, o cualquier lugar donde WordPress permita shortcodes.

---

## 📝 Sintaxis Básica

### Uso Simple
```
[mirrorly id_product="123"]
```

### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|:----------|:-----|:----------|:------------|
| `id_product` | Entero | ✅ **Sí** | ID del producto de WooCommerce |

{: .warning }
> **⚠️ Importante**: El parámetro `id_product` es obligatorio. Sin él, el shortcode mostrará un mensaje de error.

---

## 🚀 Ejemplos de Uso

### En una Página o Entrada

Puedes insertar el shortcode directamente en el editor de WordPress:

```markdown
¡Mira cómo te queda este producto increíble!

[mirrorly id_product="456"]

¿Te gusta? ¡Cómpralo ahora!
```

### En un Widget de Texto

1. Ve a **Apariencia > Widgets**
2. Añade un widget de **Texto**
3. Inserta el shortcode:

```
[mirrorly id_product="789"]
```

### En Código PHP (Para Desarrolladores)

```php
// En templates de tema
echo do_shortcode('[mirrorly id_product="123"]');

// Con variable dinámica
$product_id = get_the_ID();
echo do_shortcode("[mirrorly id_product=\"{$product_id}\"]");

// En hooks de WordPress
add_action('wp_footer', function() {
    if (is_product()) {
        echo do_shortcode('[mirrorly id_product="' . get_the_ID() . '"]');
    }
});
```

### En Constructores de Páginas

**Elementor**
1. Añade un widget de **Shortcode**
2. Inserta: `[mirrorly id_product="123"]`

**Gutenberg**
1. Añade un bloque de **Shortcode**
2. Inserta: `[mirrorly id_product="123"]`

**Divi**
1. Añade un módulo de **Código**
2. Inserta: `[mirrorly id_product="123"]`

---

## ✅ Validaciones del Shortcode

El shortcode incluye múltiples validaciones para garantizar su correcto funcionamiento:

### 1. ID de Producto Válido
```
❌ [mirrorly id_product="0"]
❌ [mirrorly id_product="abc"]
✅ [mirrorly id_product="123"]
```

### 2. Producto Existente
El producto debe existir en WooCommerce:
```
❌ ID 99999 (no existe)
✅ ID 123 (producto válido)
```

### 3. Mirrorly Habilitado
El producto debe tener Mirrorly activado en su configuración:
- ✅ Mirrorly habilitado en el producto
- ✅ API key configurada
- ✅ Licencia válida

### 4. Imagen Disponible
El producto debe tener al menos una imagen:
- ✅ Imagen principal del producto
- ✅ O imagen específica de Mirrorly configurada

---

## 🚨 Mensajes de Error

Si alguna validación falla, el shortcode mostrará mensajes de error descriptivos:

| Error | Mensaje |
|:------|:--------|
| ID inválido | "Error: ID de producto no válido en el shortcode [mirrorly]" |
| Producto no existe | "Error: Producto no encontrado" |
| Mirrorly deshabilitado | "Mirrorly no está habilitado para este producto" |
| Sin imagen | "Error: No hay imagen disponible para este producto" |

{: .note }
> **📝 Nota**: Los mensajes de error solo se muestran a administradores. Los visitantes verán el widget oculto si hay errores.

---

## ⚙️ Funcionalidades Técnicas

### Carga Inteligente de Scripts
- Los CSS y JavaScript se cargan **solo cuando es necesario**
- Optimización automática para rendimiento
- Compatible con sistemas de cache

### Misma Funcionalidad que el Widget
- ✅ Generación de imágenes con IA
- ✅ Límites de licencia (FREE/PRO)
- ✅ Rate limiting y control de abuso
- ✅ Todas las características PRO

### Compatibilidad
- ✅ WordPress 5.0+
- ✅ WooCommerce 4.0+
- ✅ Todos los temas
- ✅ Constructores de páginas
- ✅ Plugins de cache
- ✅ Multisitio

---

## 🎨 Casos de Uso Avanzados

### Landing Page de Producto
```html
<div class="hero-section">
    <h1>¡Pruébate este increíble producto!</h1>
    [mirrorly id_product="123"]
    <a href="/producto/123" class="cta-button">Comprar Ahora</a>
</div>
```

### Comparador de Productos
```html
<div class="product-comparison">
    <div class="product-column">
        <h3>Producto A</h3>
        [mirrorly id_product="123"]
    </div>
    <div class="product-column">
        <h3>Producto B</h3>
        [mirrorly id_product="456"]
    </div>
</div>
```

### Widget en Sidebar
```html
<div class="sidebar-widget">
    <h4>¡Pruébate el producto destacado!</h4>
    [mirrorly id_product="789"]
</div>
```

---

## 🔧 Para Desarrolladores

### Hooks Disponibles

```php
// Antes de mostrar el widget del shortcode
do_action('mirrorly_before_shortcode_widget', $product_id);

// Después de mostrar el widget del shortcode
do_action('mirrorly_after_shortcode_widget', $product_id);

// Filtrar atributos del shortcode
$atts = apply_filters('mirrorly_shortcode_atts', $atts, $product_id);
```

### Personalización CSS

```css
/* Estilos específicos para shortcode */
.mirrorly-widget.shortcode-widget {
    margin: 20px 0;
    border: 1px solid #ddd;
    border-radius: 8px;
}

/* Responsive */
@media (max-width: 768px) {
    .mirrorly-widget.shortcode-widget {
        margin: 10px 0;
    }
}
```

### Detección de Shortcode

```php
// Verificar si una página contiene el shortcode
function has_mirrorly_shortcode($post_id = null) {
    if (!$post_id) {
        $post_id = get_the_ID();
    }
    
    $content = get_post_field('post_content', $post_id);
    return has_shortcode($content, 'mirrorly');
}
```

---

## 📊 Rendimiento y Optimización

### Carga Condicional
- Scripts se cargan **solo** cuando el shortcode está presente
- CSS inline mínimo para evitar FOUC
- JavaScript diferido para mejor rendimiento

### Cache Compatibility
- Compatible con **WP Rocket**, **W3 Total Cache**, **WP Super Cache**
- URLs de imágenes optimizadas para CDN
- Minificación automática en producción

### SEO Friendly
- Contenido del widget indexable
- Imágenes con alt text apropiado
- Schema markup para productos

---

## 🆘 Solución de Problemas

### El Shortcode No Se Muestra

1. **Verifica el ID del producto**:
   ```
   [mirrorly id_product="123"] ← ¿Es correcto?
   ```

2. **Comprueba que Mirrorly esté habilitado**:
   - Ve al producto en WooCommerce
   - Verifica que Mirrorly esté activado

3. **Revisa la configuración**:
   - API key configurada
   - Licencia válida

### Error de Scripts

Si los scripts no cargan:

```php
// Forzar carga de scripts (solo para debug)
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('mirrorly-frontend');
    wp_enqueue_script('mirrorly-frontend');
});
```

### Conflictos con Otros Plugins

```php
// Aumentar prioridad del shortcode
remove_shortcode('mirrorly');
add_shortcode('mirrorly', 'mi_funcion_mirrorly_personalizada');
```

---

## 📚 Recursos Adicionales

- [Configuración de Google AI Studio](google-ai-setup.html)
- [Guía de Usuario](user-guide.html)
- [Documentación Principal](index.html)
- [Soporte Técnico](https://mirrorly.pro/support)

{: .highlight }
> **🎉 ¡Listo!** Ya sabes cómo usar el shortcode `[mirrorly]` para llevar la visualización con IA a cualquier parte de tu sitio web.
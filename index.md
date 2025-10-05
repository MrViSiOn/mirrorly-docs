---
title: Mirrorly - Visualización de Productos con IA
layout: default
nav_order: 1
description: "Plugin de WordPress que permite a los clientes visualizarse usando productos antes de comprarlos mediante inteligencia artificial"
permalink: /
---

<div align="center">
  <img src="logo.png" alt="Mirrorly Logo" class="main-logo">
</div>

# Mirrorly
{: .fs-9 }

Plugin de WordPress que permite a los clientes **visualizarse usando productos** antes de comprarlos mediante inteligencia artificial.
{: .fs-6 .fw-300 }

[Comenzar ahora](#instalación){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[Ver en GitHub](https://github.com/MrViSiOn/mirrorly-docs){: .btn .fs-5 .mb-4 .mb-md-0 }



<img src="/assets/images/GlopLocal-Free.png" alt="Frontend" width="100%" style="margin:auto; display: block;">

---

## 🚀 Características Principales

### 🤖 Inteligencia Artificial Avanzada
Utiliza **Google Generative AI** para crear visualizaciones realistas donde el cliente aparece usando el producto seleccionado.

### 💰 Modelo Freemium
- **Versión FREE**: 3 productos
- **Versión PRO**: Productos ilimitados, hasta 2000 generaciones/mes

### 🛒 Integración WooCommerce
Integración nativa con WooCommerce. Activa Mirrorly en productos específicos desde el panel de administración.

### ⚡ Control de Uso Inteligente
Sistema de rate limiting y control de abuso para optimizar costos y rendimiento.

---

## 🎯 Productos Compatibles

| Categoría | Productos | Efectividad |
|:----------|:----------|:------------|
| **👕 Ropa** | Camisetas, vestidos, chaquetas | ⭐⭐⭐⭐⭐ |
| **👓 Accesorios** | Sombreros, gafas, bufandas | ⭐⭐⭐⭐⭐ |
| **💍 Bisutería** | Collares, pulseras, pendientes | ⭐⭐⭐⭐ |
| **👟 Calzado** | Zapatos, botas, zapatillas | ⭐⭐⭐⭐ |

---

## 📦 Instalación

### Paso 1: Instalar el Plugin

1. Descarga el plugin desde el repositorio oficial
2. Sube el archivo ZIP a WordPress (`Plugins > Añadir nuevo > Subir plugin`)
3. Activa el plugin desde el panel de administración

### Paso 2: Configurar API Token

{: .highlight }
> **🔑 Importante**: Necesitas un API token de Google AI Studio para que funcione el plugin.

[📖 **Guía completa para obtener tu API Token**]({{ site.baseurl }}{% link google-ai-setup.md %}){: .btn .btn-outline }

### Paso 3: Configurar el Plugin

1. Ve a `Mirrorly > Configuración` en tu panel de WordPress
2. Introduce tu API Key de Google AI Studio
3. Configura el mensaje global (opcional)
4. Guarda los cambios

### Paso 4: Habilitar en Productos

1. Edita cualquier producto en WooCommerce
2. Busca la sección "Mirrorly"
3. Activa "Habilitar Mirrorly para este producto"
4. Selecciona la imagen principal del producto
5. Actualiza el producto

---

## 📖 Guías de Usuario


### Para Clientes de la Tienda
[📱 **Guía de Usuario Completa**]({{ site.baseurl }}{% link user-guide.md %}){: .btn .btn-primary }

Aprende cómo usar la funcionalidad de visualización con IA para ver cómo te quedan los productos.

### Para Administradores
[⚙️ **Configuración del API Token**]({{ site.baseurl }}{% link google-ai-setup.md %}){: .btn .btn-outline }

Tutorial paso a paso para configurar Google AI Studio y obtener tu API token.

---

## 🔧 Cómo Funciona

<img src="/assets/images/como-funciona-2025-10-04-111056.png" alt="Como funciona" width="50%" style="margin:auto; display: block;">

1. **Subida de Imagen**: El cliente sube su foto en la ficha del producto
2. **Procesamiento IA**: Google Generative AI analiza tanto la foto del cliente como la imagen del producto
3. **Generación**: Se crea una imagen realista donde el cliente aparece usando el producto
4. **Resultado**: La imagen se muestra instantáneamente en la página del producto

---

## 💎 Versiones y Precios

### 🆓 Versión FREE
- **Productos habilitados**: 3 máximo
- **Generaciones por mes**: 10
- **Velocidad**: 1 generación cada 60 segundos
- **Soporte**: Documentación online

### 💼 Versión PRO

| Plan | Productos | Generaciones/mes | Velocidad | Precio |
|:-----|:----------|:-----------------|:----------|:-------|
| **PRO Básico** | Ilimitados | 100 | 1 cada 30s | 29 €/mes |
| **PRO Premium** | Ilimitados | 500 | 1 cada 15s | 79 €/mes |

<div style="text-align: center; margin: 20px 0;">
  <a href="/upgrade-to-pro/" 
     style="display: inline-block; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 12px 25px; 
            text-decoration: none; 
            border-radius: 25px; 
            font-weight: bold; 
            transition: all 0.3s ease;"
     onmouseover="this.style.transform='translateY(-2px)';"
     onmouseout="this.style.transform='translateY(0)';">
    🚀 Ver Planes PRO
  </a>
</div>

---

## 🚀 Próximos Pasos

### Si eres Cliente
1. Busca tiendas que usen Mirrorly
2. Prueba la funcionalidad con diferentes productos
3. ¡Compra con confianza sabiendo cómo te queda!

### Si eres Propietario de Tienda
1. [Configura tu API Key de Google AI Studio]({{ site.baseurl }}{% link google-ai-setup.md %})
2. Habilita Mirrorly en tus productos más populares
3. Observa cómo aumentan tus conversiones

---

## 📞 Soporte y Comunidad

**¿Necesitas ayuda?**
- 📖 Consulta nuestra [Guía de Usuario]({{ site.baseurl }}{% link user-guide.md %})
- 🔧 Revisa la [Configuración del API Token]({{ site.baseurl }}{% link google-ai-setup.md %})
- 💬 Contacta con nuestro equipo de soporte

**¿Quieres contribuir?**
- 🐛 Reporta bugs en GitHub
- 💡 Sugiere nuevas características
- ⭐ Danos una estrella en GitHub si te gusta el proyecto

---

{: .highlight }
> **🎉 ¡Bienvenido a Mirrorly!** Transforma tu tienda online con la magia de la inteligencia artificial.

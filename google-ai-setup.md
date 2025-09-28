---
title: Configuración de Google AI Studio
layout: default
nav_order: 2
description: "Guía paso a paso para obtener y configurar tu API token de Google AI Studio para Mirrorly"
---

# Configuración de Google AI Studio
{: .no_toc }

Guía completa para obtener y configurar tu API token de Google AI Studio para usar con Mirrorly.
{: .fs-6 .fw-300 }

## Tabla de contenidos
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## 🎯 ¿Qué es Google AI Studio?

Google AI Studio es la plataforma oficial de Google para acceder a sus modelos de inteligencia artificial generativa, incluyendo **Gemini Pro Vision**, que es el modelo que utiliza Mirrorly para generar las visualizaciones de productos.

{: .highlight }
> **💡 Importante**: Necesitas una cuenta de Google y acceso a Google AI Studio para obtener tu API token. El servicio tiene costos asociados, pero Google ofrece créditos gratuitos para empezar.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:

- ✅ **Cuenta de Google** activa
- ✅ **Tarjeta de crédito** para verificación (Google ofrece créditos gratuitos)
- ✅ **Acceso a internet** estable
- ✅ **Navegador web** actualizado

---

## 🚀 Paso 1: Acceder a Google AI Studio

### 1.1 Ir a Google AI Studio

1. Abre tu navegador web
2. Ve a **[https://aistudio.google.com](https://aistudio.google.com)**
3. Haz clic en **"Get started"** o **"Comenzar"**

{: .highlight }
> **📸 Captura requerida**: Pantalla principal de Google AI Studio con el botón "Get started"

### 1.2 Iniciar Sesión

1. Inicia sesión con tu **cuenta de Google**
2. Si no tienes cuenta, crea una nueva
3. Acepta los **términos y condiciones** de Google AI Studio

---

## 🔧 Paso 2: Configurar el Proyecto

### 2.1 Crear o Seleccionar Proyecto

1. En la pantalla principal, busca la opción **"Create project"** o **"Crear proyecto"**
2. Si ya tienes proyectos, puedes seleccionar uno existente
3. Asigna un nombre descriptivo como **"Mirrorly-WordPress"**

{: .highlight }
> **📸 Captura requerida**: Pantalla de creación de proyecto con el nombre "Mirrorly-WordPress"

### 2.2 Configurar Facturación (Si es necesario)

1. Google puede solicitar configurar la facturación
2. Añade tu **tarjeta de crédito** para verificación
3. **No te preocupes**: Google ofrece créditos gratuitos para empezar

{: .warning }
> **⚠️ Importante**: Aunque se requiere tarjeta de crédito, Google ofrece $300 USD en créditos gratuitos. Mirrorly está optimizado para minimizar costos.

---

## 🔑 Paso 3: Generar API Key

### 3.1 Acceder a la Sección de API Keys

1. En el panel lateral izquierdo, busca **"API Keys"** o **"Claves de API"**
2. Haz clic en esta sección
3. Verás la lista de API keys existentes (probablemente vacía)

{: .highlight }
> **📸 Captura requerida**: Panel lateral con la sección "API Keys" seleccionada

### 3.2 Crear Nueva API Key

1. Haz clic en **"Create API Key"** o **"Crear clave de API"**
2. Selecciona el proyecto que creaste anteriormente
3. Asigna un nombre descriptivo como **"Mirrorly-Plugin"**
4. Haz clic en **"Create"** o **"Crear"**

{: .highlight }
> **📸 Captura requerida**: Formulario de creación de API Key con el nombre "Mirrorly-Plugin"

### 3.3 Copiar la API Key

1. Una vez creada, aparecerá tu **API Key**
2. Haz clic en el **icono de copiar** 📋
3. **¡IMPORTANTE!** Guarda esta clave en un lugar seguro

{: .warning }
> **🔒 Seguridad**: Esta API Key es como una contraseña. No la compartas públicamente y guárdala en un lugar seguro.

{: .highlight }
> **📸 Captura requerida**: API Key generada con el botón de copiar visible

---

## ⚙️ Paso 4: Configurar en WordPress

### 4.1 Acceder al Panel de Mirrorly

1. Ve a tu **panel de administración de WordPress**
2. En el menú lateral, busca **"Mirrorly"**
3. Haz clic en **"Configuración"** o **"Settings"**

{: .highlight }
> **📸 Captura requerida**: Panel de WordPress con el menú de Mirrorly visible

### 4.2 Introducir la API Key

1. Busca el campo **"Google AI Studio API Key"**
2. **Pega la API Key** que copiaste anteriormente
3. Haz clic en **"Guardar cambios"** o **"Save Changes"**

{: .highlight }
> **📸 Captura requerida**: Formulario de configuración de Mirrorly con el campo API Key

### 4.3 Verificar la Conexión

1. Después de guardar, deberías ver un mensaje de **"Conexión exitosa"**
2. Si hay errores, revisa que la API Key esté correctamente copiada
3. Verifica que no haya espacios extra al principio o final

---

## 💰 Paso 5: Entender Facturación y Uso

### 5.1 Créditos Gratuitos

Google AI Studio ofrece:
- **$300 USD** en créditos gratuitos para nuevos usuarios
- **Límites generosos** para uso inicial
- **Facturación por uso** después de agotar créditos

### 5.2 Costos Estimados

Para **Gemini Pro Vision** (modelo usado por Mirrorly):

| Uso | Costo Aproximado | Generaciones Estimadas |
|:----|:-----------------|:-----------------------|
| **Créditos gratuitos** | $0 | ~15,000-20,000 imágenes |
| **Por 1000 imágenes** | ~$2-4 USD | Depende del tamaño |
| **Uso mensual típico** | $10-30 USD | 5,000-10,000 imágenes |

{: .success }
> **💡 Optimización**: Mirrorly está optimizado para minimizar costos redimensionando imágenes y usando prompts eficientes.

### 5.3 Monitorear Uso

1. En Google AI Studio, ve a **"Usage"** o **"Uso"**
2. Aquí puedes ver tu **consumo actual**
3. Configura **alertas de facturación** si lo deseas

---

## 🔧 Solución de Problemas

### Error: "API Key inválida"

**Posibles causas:**
- API Key copiada incorrectamente
- Espacios extra en la clave
- Proyecto no configurado correctamente

**Solución:**
1. Vuelve a copiar la API Key desde Google AI Studio
2. Asegúrate de no incluir espacios extra
3. Verifica que el proyecto esté activo

### Error: "Cuota excedida"

**Posibles causas:**
- Has agotado tus créditos gratuitos
- Límites de uso diario alcanzados

**Solución:**
1. Revisa tu uso en Google AI Studio
2. Configura facturación si es necesario
3. Espera al siguiente período de facturación

### Error: "Servicio no disponible"

**Posibles causas:**
- Problemas temporales de Google AI Studio
- Región no soportada

**Solución:**
1. Espera unos minutos e intenta de nuevo
2. Verifica el estado de Google AI Studio
3. Contacta con soporte si persiste

---

## 🛡️ Mejores Prácticas de Seguridad

### 🔒 Proteger tu API Key

1. **Nunca compartas** tu API Key públicamente
2. **No la incluyas** en código fuente público
3. **Úsala solo** en tu servidor WordPress
4. **Regenera la clave** si sospechas que está comprometida

### 📊 Monitoreo de Uso

1. **Revisa regularmente** tu consumo en Google AI Studio
2. **Configura alertas** de facturación
3. **Establece límites** de gasto si es necesario

### 🔄 Rotación de Claves

1. **Cambia tu API Key** periódicamente (cada 3-6 meses)
2. **Mantén un registro** de cuándo la cambias
3. **Actualiza inmediatamente** en WordPress

---

## 📈 Optimización de Costos

### 🎯 Configuración Eficiente

1. **Usa la versión FREE** inicialmente para probar
2. **Habilita Mirrorly** solo en productos que realmente lo necesiten
3. **Educa a tus clientes** sobre el uso responsable

### 📊 Monitoreo de Rendimiento

1. **Revisa estadísticas** de uso mensualmente
2. **Identifica patrones** de uso alto
3. **Ajusta límites** según sea necesario

### 💡 Consejos de Ahorro

- **Optimiza imágenes** antes de subirlas
- **Usa imágenes de producto** de alta calidad para mejores resultados
- **Configura rate limiting** apropiado para tu tienda

---

## 🚀 Próximos Pasos

Una vez configurada tu API Key:

1. **[Configura productos]({{ site.baseurl }}{% link user-guide.md %}#para-administradores-de-tienda)** en WooCommerce
2. **Prueba la funcionalidad** con diferentes tipos de productos
3. **Monitorea el uso** y ajusta según sea necesario
4. **Considera upgrade** a versión PRO si necesitas más funcionalidades

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas con la configuración:

- 📖 Revisa la [Guía de Usuario completa]({{ site.baseurl }}{% link user-guide.md %})
- 🔧 Verifica la [solución de problemas](#solución-de-problemas) en esta página
- 💬 Contacta con nuestro equipo de soporte

{: .success }
> **🎉 ¡Felicidades!** Una vez configurada tu API Key, estarás listo para ofrecer visualizaciones con IA a tus clientes.
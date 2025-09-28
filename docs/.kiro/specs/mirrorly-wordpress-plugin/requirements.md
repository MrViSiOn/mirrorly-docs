# Requirements Document - Plugin Mirrorly para WordPress

## Introducción

Mirrorly es un plugin innovador para WordPress/WooCommerce que permite a los usuarios visualizarse usando productos de moda, bisutería y utensilios mediante inteligencia artificial. El plugin utiliza el servicio externo Nanobanana para generar imágenes realistas donde el usuario aparece "usando" o "portando" el producto seleccionado.

El plugin está diseñado en dos versiones (FREE y PRO) y se conecta a una API REST centralizada que gestiona las peticiones a Nanobanana y el control de licencias.

## Requisitos

### Requisito 1: Funcionalidad Core del Plugin

**Historia de Usuario:** Como propietario de una tienda WooCommerce, quiero que mis clientes puedan subir su foto y ver cómo se verían con mis productos, para que aumenten las conversiones y reduzcan las devoluciones.

#### Criterios de Aceptación

1. CUANDO un usuario esté en una ficha de producto habilitada ENTONCES el sistema DEBERÁ mostrar una sección para subir imagen personal
2. CUANDO el usuario suba una imagen válida ENTONCES el sistema DEBERÁ enviarla junto con la imagen del producto a la API de Nanobanana
3. CUANDO la API devuelva la imagen generada ENTONCES el sistema DEBERÁ mostrarla al usuario en la ficha del producto
4. SI la generación falla ENTONCES el sistema DEBERÁ mostrar un mensaje de error apropiado
5. CUANDO se genere una imagen ENTONCES el sistema DEBERÁ permitir al usuario descargarla o compartirla

### Requisito 2: Versión FREE

**Historia de Usuario:** Como usuario de la versión gratuita, quiero probar la funcionalidad en un número limitado de productos y generaciones, para que pueda evaluar el plugin antes de comprar la versión PRO.

#### Criterios de Aceptación

1. CUANDO se active la versión FREE ENTONCES el sistema DEBERÁ limitar la funcionalidad a máximo X productos (configurable)
2. CUANDO se active la versión FREE ENTONCES el sistema DEBERÁ registrar el dominio para control de uso y límites
3. CUANDO se alcance el límite de productos ENTONCES el sistema DEBERÁ mostrar mensaje promocional para upgrade a PRO
4. CUANDO se alcance el límite de generaciones mensuales ENTONCES el sistema DEBERÁ bloquear nuevas generaciones hasta el siguiente período
5. CUANDO el administrador configure el mensaje ENTONCES el sistema DEBERÁ permitir personalizar el texto que aparece en la ficha de producto
6. SI no hay API key configurada ENTONCES el sistema DEBERÁ mostrar enlace al tutorial de configuración
7. CUANDO se registre la versión FREE ENTONCES el sistema DEBERÁ crear cuenta básica con límites predefinidos

### Requisito 3: Versión PRO

**Historia de Usuario:** Como usuario premium, quiero acceso ampliado a las funcionalidades y personalización avanzada, para que pueda integrar perfectamente el plugin con mi marca.

#### Criterios de Aceptación

1. CUANDO se active la versión PRO ENTONCES el sistema DEBERÁ permitir mayor límite de productos y generaciones según plan contratado
2. CUANDO el administrador acceda a configuración ENTONCES el sistema DEBERÁ permitir personalizar colores y estilos del widget
3. CUANDO se configure la selección de productos ENTONCES el sistema DEBERÁ permitir elegir qué productos específicos tienen la funcionalidad activa
4. CUANDO se registre la licencia ENTONCES el sistema DEBERÁ validar el dominio contra el servidor de licencias
5. SI la licencia expira o es inválida ENTONCES el sistema DEBERÁ degradar automáticamente a funcionalidad FREE
6. CUANDO se alcancen los límites del plan PRO ENTONCES el sistema DEBERÁ ofrecer upgrade a plan superior o esperar al siguiente período

### Requisito 4: Panel de Administración WordPress

**Historia de Usuario:** Como administrador del sitio, quiero gestionar fácilmente la configuración del plugin y seleccionar qué productos usan la funcionalidad, para que tenga control total sobre la experiencia del usuario.

#### Criterios de Aceptación

1. CUANDO acceda al panel de admin ENTONCES el sistema DEBERÁ mostrar página de configuración del plugin
2. CUANDO configure la API key ENTONCES el sistema DEBERÁ proporcionar enlace directo al tutorial de Nanobanana
3. CUANDO edite un producto ENTONCES el sistema DEBERÁ mostrar metabox para activar/desactivar Mirrorly
4. CUANDO active Mirrorly en un producto ENTONCES el sistema DEBERÁ permitir seleccionar qué imagen de la galería usar para Nanobanana
5. CUANDO guarde la configuración ENTONCES el sistema DEBERÁ validar la API key contra el servidor

### Requisito 5: API REST Centralizada

**Historia de Usuario:** Como desarrollador del sistema, quiero una API centralizada que gestione todas las peticiones y licencias, para que pueda escalar a otras plataformas en el futuro.

#### Criterios de Aceptación

1. CUANDO el plugin haga una petición ENTONCES la API DEBERÁ autenticar usando API key válida
2. CUANDO se solicite generación de imagen ENTONCES la API DEBERÁ validar límites según tipo de licencia antes de procesar
3. CUANDO se procese una imagen ENTONCES la API DEBERÁ llamar a Nanobanana y devolver el resultado
4. CUANDO se registre una licencia (FREE o PRO) ENTONCES la API DEBERÁ validar y almacenar el dominio con sus límites correspondientes
5. SI se exceden los límites ENTONCES la API DEBERÁ devolver error específico con código de estado apropiado
6. CUANDO se registre un dominio FREE ENTONCES la API DEBERÁ crear automáticamente una cuenta con límites básicos
7. CUANDO se valide una licencia ENTONCES la API DEBERÁ devolver información actualizada de uso y límites restantes

### Requisito 6: Integración con Google Generative AI

**Historia de Usuario:** Como usuario final, quiero que las imágenes generadas sean de alta calidad y realistas, para que pueda tomar decisiones de compra informadas.

#### Criterios de Aceptación

1. CUANDO se envíe una imagen a Google AI ENTONCES el sistema DEBERÁ optimizar el tamaño y formato antes del envío
2. CUANDO se inicie la generación ENTONCES el sistema DEBERÁ ejecutar un proceso de dos pasos: análisis de imágenes para generar prompt optimizado, seguido de generación de imagen final
3. CUANDO Google AI analice las imágenes ENTONCES el sistema DEBERÁ generar un prompt específico y optimizado para e-commerce
4. CUANDO se use el prompt optimizado ENTONCES el sistema DEBERÁ generar la imagen final combinada con máxima calidad
5. CUANDO Google AI procese cualquier paso ENTONCES el sistema DEBERÁ manejar timeouts y reintentos apropiadamente
6. CUANDO se reciba la imagen generada ENTONCES el sistema DEBERÁ optimizarla para web antes de mostrarla
7. SI Google AI devuelve error en cualquier paso ENTONCES el sistema DEBERÁ traducir el error a mensaje comprensible para el usuario
8. CUANDO se complete la generación ENTONCES el sistema DEBERÁ registrar la transacción incluyendo el prompt usado para analytics y mejoras

### Requisito 7: Sistema de Licencias y Control

**Historia de Usuario:** Como propietario del producto, quiero controlar el uso de las licencias PRO y prevenir uso no autorizado, para que pueda monetizar efectivamente el plugin.

#### Criterios de Aceptación

1. CUANDO se active una licencia PRO ENTONCES el sistema DEBERÁ registrar el dominio en la base de datos central
2. CUANDO el plugin inicie ENTONCES el sistema DEBERÁ verificar periódicamente la validez de la licencia
3. CUANDO se detecte uso no autorizado ENTONCES el sistema DEBERÁ desactivar automáticamente las funciones PRO
4. CUANDO expire una licencia ENTONCES el sistema DEBERÁ notificar al usuario con X días de antelación
5. SI se intenta usar la misma licencia en múltiples dominios ENTONCES el sistema DEBERÁ bloquear el acceso no autorizado

### Requisito 8: Control de Uso y Prevención de Abuso

**Historia de Usuario:** Como propietario del servicio, quiero controlar el uso de la API de Nanobanana para evitar costos excesivos y abuso del sistema, para que el negocio sea sostenible.

#### Criterios de Aceptación

1. CUANDO un usuario intente generar una imagen ENTONCES el sistema DEBERÁ verificar límites antes de llamar a Nanobanana
2. CUANDO se detecten múltiples intentos rápidos del mismo usuario ENTONCES el sistema DEBERÁ implementar rate limiting (ej: 1 generación cada 30 segundos)
3. CUANDO se alcance el límite mensual ENTONCES el sistema DEBERÁ bloquear nuevas generaciones hasta el siguiente período
4. CUANDO se detecte uso sospechoso ENTONCES el sistema DEBERÁ registrar la actividad para revisión manual
5. CUANDO se procese una imagen ENTONCES el sistema DEBERÁ validar formato y tamaño antes de enviar a Nanobanana
6. SI una imagen es demasiado grande ENTONCES el sistema DEBERÁ redimensionarla automáticamente para optimizar costos
7. CUANDO se complete una generación ENTONCES el sistema DEBERÁ actualizar contadores de uso en tiempo real

**Límites Propuestos:**
- FREE: 10 generaciones/mes, 1 cada 60 segundos, máximo 3 productos
- PRO Básico: 100 generaciones/mes, 1 cada 30 segundos, productos ilimitados
- PRO Premium: 500 generaciones/mes, 1 cada 15 segundos, productos ilimitados

### Requisito 9: Experiencia de Usuario Frontend

**Historia de Usuario:** Como cliente de la tienda, quiero una experiencia fluida y atractiva al probar productos virtualmente, para que me sienta confiado en mi compra.

#### Criterios de Aceptación

1. CUANDO cargue una ficha de producto habilitada ENTONCES el sistema DEBERÁ mostrar el widget de Mirrorly de forma prominente
2. CUANDO suba mi imagen ENTONCES el sistema DEBERÁ mostrar preview antes de procesar
3. CUANDO se esté procesando ENTONCES el sistema DEBERÁ mostrar indicador de progreso atractivo
4. CUANDO se complete la generación ENTONCES el sistema DEBERÁ mostrar la imagen con opciones de descarga/compartir
5. SI hay error ENTONCES el sistema DEBERÁ permitir reintentar fácilmente

## Consideraciones Técnicas

### Sobre el uso de n8n como API

El uso de n8n para los endpoints podría tener sentido para prototipado rápido y automatizaciones simples, pero para un producto comercial recomiendo considerar:

**Ventajas de n8n:**
- Desarrollo rápido de workflows
- Interfaz visual para gestión
- Integraciones nativas con muchos servicios

**Desventajas para este caso:**
- Menor control sobre rendimiento y escalabilidad
- Dependencia de herramienta externa
- Posibles limitaciones para lógica compleja de licencias
- Costos adicionales según volumen

**Recomendación:** Desarrollar API REST nativa en PHP para mayor control, rendimiento y escalabilidad a largo plazo.
##
Consideraciones Técnicas Actualizadas

**Sobre la tecnología de la API**

Se ha decidido usar Node.js con TypeScript para la API REST centralizada por las siguientes razones:

**Ventajas de Node.js/TypeScript:**
- Excelente integración con @google/generative-ai
- Desarrollo rápido y mantenible con TypeScript
- Gran ecosistema de librerías para manejo de imágenes (Sharp, Multer)
- Escalabilidad horizontal nativa
- Mejor performance para operaciones I/O intensivas

**Integración con Google Generative AI:**
- Librería oficial @google/generative-ai bien mantenida
- Soporte nativo para procesamiento de imágenes
- Modelos avanzados como Gemini Pro Vision
- Costos competitivos y transparentes
- API robusta con manejo de errores integrado
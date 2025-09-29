# Publicación de Documentación con Git Subtree

Este documento explica cómo publicar la documentación de Mirrorly usando Git Subtree para GitHub Pages.

## Configuración Inicial

### 1. Configurar el Subtree

Si es la primera vez que configuras el subtree, ejecuta:

```bash
# Agregar el subtree remoto (solo la primera vez)
git subtree add --prefix=docs origin gh-pages --squash
```

Si ya existe el subtree, puedes omitir este paso.

### 2. Verificar la Configuración

Asegúrate de que el directorio `docs` contenga:
- `_config.yml` - Configuración de Jekyll
- `index.md` - Página principal
- Archivos de documentación (`.md`)
- `Gemfile` - Dependencias de Jekyll

## Proceso de Publicación

### 1. Realizar Cambios en la Documentación

Edita los archivos en el directorio `docs/`:
- `shortcode-guide.md` - Documentación del shortcode
- `user-guide.md` - Guía de usuario
- `google-ai-setup.md` - Configuración de Google AI
- Otros archivos de documentación

### 2. Commit de los Cambios

```bash
# Agregar cambios al staging
git add docs/

# Hacer commit de los cambios
git commit -m "docs: actualizar documentación del shortcode"
```

### 3. Publicar con Subtree

```bash
# Publicar los cambios al branch gh-pages
git subtree push --prefix=docs origin gh-pages
```

### 4. Verificar la Publicación

1. Ve a la configuración del repositorio en GitHub
2. Navega a **Settings > Pages**
3. Verifica que la fuente esté configurada como "Deploy from a branch: gh-pages"
4. La documentación estará disponible en: `https://[usuario].github.io/[repositorio]/`

## Comandos Útiles

### Actualizar desde el Branch Principal

Si necesitas sincronizar cambios desde el branch principal:

```bash
# Pull de cambios desde gh-pages
git subtree pull --prefix=docs origin gh-pages --squash
```

### Verificar el Estado del Subtree

```bash
# Ver el historial del subtree
git log --oneline --graph --decorate docs/

# Ver diferencias pendientes
git diff HEAD -- docs/
```

### Forzar Publicación (si hay conflictos)

```bash
# Forzar push del subtree (usar con precaución)
git subtree push --prefix=docs origin gh-pages --force
```

## Estructura de Archivos

```
docs/
├── _config.yml              # Configuración de Jekyll
├── index.md                 # Página principal
├── user-guide.md           # Guía de usuario
├── google-ai-setup.md      # Configuración de Google AI
├── shortcode-guide.md      # Documentación del shortcode (NUEVA)
├── Gemfile                 # Dependencias de Jekyll
└── _sass/                  # Estilos personalizados
```

## Notas Importantes

1. **Solo los archivos en `docs/` se publican** - Los cambios en otros directorios no afectan la documentación.

2. **Jekyll Build** - GitHub Pages construye automáticamente el sitio usando Jekyll cuando detecta cambios en `gh-pages`.

3. **Tiempo de Propagación** - Los cambios pueden tardar unos minutos en aparecer en el sitio publicado.

4. **Formato just-the-docs** - Todos los archivos `.md` deben incluir el front matter apropiado:
   ```yaml
   ---
   title: Título de la Página
   layout: default
   nav_order: 4
   description: "Descripción de la página"
   ---
   ```

## Troubleshooting

### Error: "Working tree has modifications"

```bash
# Verificar cambios pendientes
git status

# Hacer commit de cambios pendientes
git add . && git commit -m "docs: cambios pendientes"
```

### Error: "Updates were rejected"

```bash
# Hacer pull primero
git subtree pull --prefix=docs origin gh-pages --squash

# Resolver conflictos si los hay
# Luego hacer push nuevamente
git subtree push --prefix=docs origin gh-pages
```

### Verificar que Jekyll Funciona Localmente

```bash
cd docs
bundle install
bundle exec jekyll serve --port 4000
```

Luego visita `http://localhost:4000` para verificar que todo funciona correctamente.
# 📦 Core Assets — Librerías @fabrica/*

Librerías reutilizables de la Fábrica de Software Académico (SPLE).

## Librerías disponibles

| Paquete | Core Assets | Descripción |
|---------|------------|-------------|
| `@fabrica/design-system` | CA-001 | Tokens de color, tipografía, componentes SCSS |
| `@fabrica/angular-auth` | CA-002..CA-007 | Login, Registro, AuthService, Guards (Angular) |
| `@fabrica/node-core` | CA-009..CA-013 | GraphQL base, JWT, BD, Auditoría, Feature Toggles |
| `@fabrica/academico` | CA-016, CA-017 | Módulo Materias + Inscripciones (GraphQL) |

## Instalación desde GitHub

```bash
# Instalar una librería específica (usar el subdirectorio)
npm install github:alexlunamayo2002-netizen/fabrica-software-academico#libraries

# O en package.json:
"dependencies": {
  "@fabrica/node-core": "github:alexlunamayo2002-netizen/fabrica-software-academico#libraries"
}
```

## Uso

```js
// Backend
const { verifyToken, composeModules, crearFeatureToggles } = require('@fabrica/node-core');
const { createAcademicoModule } = require('@fabrica/academico');
```

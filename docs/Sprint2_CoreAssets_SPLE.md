# Sprint 2 — Core Assets Académicos y Arquitectura de Librerías

**Proyecto:** Fábrica de Software Académico — Línea de Productos de Software (SPLE)
**Sprint:** 2 (2026-06-30 → 2026-07-13)
**Product Owner:** Msc. Antonio Quiña · **Scrum Master:** Leonel Arellano
**Equipo:** Alex Luna, Leonel Arellano, Jostin Quilca

---

## 1. Objetivo del Sprint

Ampliar la Línea de Productos con dos nuevos **Core Assets** del dominio académico
(Materias e Inscripciones), un Panel de Administración, y evolucionar la fábrica hacia
una **arquitectura de librerías NPM** con **variabilidad configurable** (feature toggles),
validada mediante un producto derivado (**SistemaMatriculas**).

---

## 2. Core Assets nuevos (formato SPLE)

### CA-016 · Módulo de Materias

| Campo | Detalle |
|-------|---------|
| **Tipo** | Variabilidad (opcional) |
| **Capa** | Backend (GraphQL) + Frontend (Angular) |
| **Commonality / Variabilidad** | Variabilidad: un producto puede incluirlo o no |
| **Entidad** | `materias(id, codigo, nombre, creditos, descripcion, docente_id)` |
| **API GraphQL** | Query: `materias`, `materia(id)` · Mutation: `crearMateria`, `actualizarMateria`, `eliminarMateria` |
| **Autorización** | Crear/editar: ADMIN y DOCENTE · Eliminar: solo ADMIN |
| **Frontend** | Componente `MateriasComponent` (tabla + formulario CRUD reactivo) |
| **Auditoría** | Acciones `CREAR_MATERIA`, `ACTUALIZAR_MATERIA`, `ELIMINAR_MATERIA` (integración con CA-012) |

### CA-017 · Módulo de Inscripciones

| Campo | Detalle |
|-------|---------|
| **Tipo** | Variabilidad (opcional) |
| **Depende de** | CA-016 (Materias) |
| **Entidad** | `inscripciones(id, estudiante_id, materia_id, estado, fecha_inscripcion)` con `UNIQUE(estudiante_id, materia_id)` |
| **API GraphQL** | Query: `inscripciones`, `inscripcionesByEstudiante`, `inscripcionesByMateria` · Mutation: `inscribir`, `desinscribir` |
| **Reglas** | No se permite doble inscripción; valida existencia de estudiante y materia |
| **Frontend** | Componente `InscripcionesComponent` (inscribir, desinscribir, listado) |
| **Auditoría** | Acciones `INSCRIBIR`, `DESINSCRIBIR` |

### HU-S2.5 · Panel de Administración

Vista exclusiva del rol **ADMIN** (protegida con `authGuard` + `roleGuard`).
Muestra estadísticas en vivo (usuarios, materias, inscripciones, estudiantes),
accesos rápidos a los módulos de gestión y la tabla de usuarios del sistema.

---

## 3. Arquitectura de Librerías (Monorepo NPM Workspaces)

El proyecto se reestructuró como **monorepo** con NPM Workspaces. Los Core Assets se
organizan en paquetes independientes bajo `packages/`, consumibles por los productos
derivados **vía importación** en lugar de clonado de carpetas.

```
fabrica-software-academico/
├── package.json          # workspaces: packages/*, backend, frontend
├── packages/
│   ├── design-system/    # @fabrica/design-system   (CA-001)
│   ├── angular-auth/     # @fabrica/angular-auth     (CA-002..CA-007)
│   ├── node-core/        # @fabrica/node-core        (CA-009..CA-013 + feature-toggles)
│   └── academico/        # @fabrica/academico        (CA-016, CA-017)
├── backend/              # servidor de referencia (Apollo GraphQL)
├── frontend/             # app de referencia (Angular)
└── crear_nueva_app.js    # generador de productos derivados
```

| Paquete | Core Assets | Rol | Código real |
|---------|-------------|-----|-------------|
| `@fabrica/design-system` | CA-001 | Tokens de diseño y estilos base | tokens.json |
| `@fabrica/angular-auth` | CA-002 … CA-007 | Autenticación/Autorización (Angular) | referencia |
| `@fabrica/node-core` | CA-009 … CA-013 | BD, JWT, Auditoría, composición, **feature toggles** | ✅ importable |
| `@fabrica/academico` | CA-016, CA-017 | Dominio académico (modelos + typeDefs + resolvers) | ✅ importable |

### Composición del backend por librerías (HU-S2.7)

El `backend/src/server.js` es un **composition root**: no contiene la lógica de los
módulos, sino que los **importa desde las librerías** y los ensambla según los feature
toggles. Las librerías usan **inyección de dependencias** (reciben el cliente de BD, el
modelo de usuario y la auditoría), de modo que son reutilizables por cualquier producto.

```js
const { createAuditoriaModule, createAcademicoModule,
        composeModules, crearFeatureToggles } = require('@fabrica/node-core');
const features = crearFeatureToggles();

const modules = [ base ];
if (features.isEnabled('CA-012_ModeloAuditoria')) modules.push(createAuditoriaModule({ client }));
if (features.isEnabled('CA-016_ModuloMaterias'))  modules.push(createAcademicoModule({ client, usuarioModel, auditoria }));

const { typeDefs, resolvers } = composeModules(modules);  // → ApolloServer
```

Los tipos GraphQL de cada librería usan `extend type Query/Mutation`, de modo que se
integran con el esquema base sin colisiones.

---

## 4. Variabilidad (Feature Toggles) — HU-S2.7

La variabilidad se expresa en **tres niveles**:

1. **Configuración declarativa** (`factory-config.json`): cada producto activa o
   desactiva Core Assets opcionales.

2. **Composición en runtime — Backend** (`@fabrica/node-core/feature-toggles`): el
   backend carga o no cada módulo (`@fabrica/academico`, auditoría) según el toggle.
   Un asset desactivado **no se importa**; no hay código muerto que podar.

   ```js
   const { crearFeatureToggles } = require('@fabrica/node-core');
   const features = crearFeatureToggles();       // lee factory-config.json
   features.isEnabled('CA-016_ModuloMaterias');  // true / false
   ```

3. **Poda estática — Frontend** (`crear_nueva_app.js`): Angular compila rutas y
   componentes de forma estática, así que el generador elimina del producto las páginas,
   servicios y rutas de los módulos desactivados.

### Commonalities vs. Variabilidades

| Commonalities (siempre presentes) | Variabilidades (opcionales) |
|-----------------------------------|-----------------------------|
| CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-008, CA-009, CA-010, CA-011, CA-013 | CA-007 (Registro abierto), CA-012 (Auditoría), CA-016 (Materias), CA-017 (Inscripciones), CA-018 (Setup BD automático) |

### CA-018 · La base de datos como Core Asset

El DDL de cada asset **viaja dentro de su librería**: `@fabrica/node-core` exporta
`ensureDatabase` (crea la database del producto si no existe), `ensureBaseTables`
(roles/usuarios) y `ensureAuditoriaTable`; `@fabrica/academico` exporta
`ensureMateriasTable` y `ensureInscripcionesTable`. Todas son idempotentes
(`CREATE TABLE IF NOT EXISTS`).

Con `CA-018_SetupBD_Automatico: true`, el backend se **auto-provisiona al arrancar**:
crea la database y las tablas de los assets activos. El flujo incremental queda:

```bash
node scripts/add-feature.js auditoria   # toggle + frontend desde GitHub
npm run dev                             # al arrancar crea la tabla auditoria sola
```

---

## 5. Producto derivado de validación — SistemaMatriculas (HU-S2.8)

```bash
node crear_nueva_app.js SistemaMatriculas
```

Ensambla un producto **completo** (todos los Core Assets, incluidos CA-016 y CA-017).
Se validó que su esquema GraphQL ensambla sin errores. Como contraprueba de variabilidad,
un producto con CA-012/CA-016/CA-017 desactivados se poda a un backend **solo-auth** que
también ensambla correctamente.

---

## 6. Cómo ejecutar el producto (MVP)

```bash
# 1. Base de datos (PostgreSQL)
#    Configura backend/.env con las credenciales (ver .env.example)

# 2. Backend
cd backend && npm install && npm run db:migrate:academico && npm run dev

# 3. Frontend
cd frontend && npm install && npm start
# App en http://localhost:4200 · API en http://localhost:4000
```

### Usuarios de demostración

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | admin@fabrica.edu | admin123 |
| DOCENTE | docente@fabrica.edu | docente123 |
| ESTUDIANTE | estudiante1@fabrica.edu | estudiante123 |

---

## 7. Resultado de la validación (Definition of Done)

| Verificación | Estado |
|--------------|--------|
| Backend CA-016/CA-017 ensambla (Apollo) | ✅ |
| Frontend compila en producción (`ng build`) | ✅ |
| Login JWT + control por roles end-to-end | ✅ |
| CRUD de Materias desde la UI (persistido en BD) | ✅ |
| Inscripción de estudiantes (persistida) | ✅ |
| Auditoría registra las acciones académicas | ✅ |
| Producto derivado completo ensambla | ✅ |
| Producto derivado podado (solo-auth) ensambla | ✅ |
| Motor de feature toggles lee la configuración | ✅ |

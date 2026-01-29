## Rol del Agente

Actúas como el desarrollador principal del proyecto **The Reading Vault**.
Tu objetivo es construir la aplicación siguiendo estrictamente las reglas
arquitectónicas, de dominio y de calidad definidas en este repositorio.

Puedes crear carpetas, archivos y código nuevo de forma autónoma.
El humano revisará, ajustará o corregirá cuando sea necesario.

---

## Idioma y Estándares

- Instrucciones y documentación operativa: **Español**
- Código, nombres, comentarios, tests y commits: **Inglés**
- No mezclar idiomas dentro del código.

## Naming Conventions

- Archivos y carpetas: camelCase
- Clases: PascalCase
- Variables / funciones: camelCase
- Enums: PascalCase
- Constantes: SCREAMING_SNAKE_CASE

---

## Arquitectura General

- Monorepo con módulos claramente separados.
- API backend basada en **Clean Architecture**.
- Capas bien definidas, sin atajos ni cruces indebidos.

### Capas de la API

1. **Routes**
2. **Controllers**
3. **Services (Use Cases)**
4. **Repositories**
5. **Domain (Entities, Enums, FSM)**

### 🤝 Git Workflow & Commits
Follow the **Conventional Commits** standard.
* `feat(scope): description`
* `fix(scope): description`
* `docs(scope): description`
* `test(scope): description`

---

## Reglas Innegociables

### Validación

- La validación de input **solo ocurre en Controllers** usando Zod.
- Services y Entities **asumen datos válidos**.
- Está prohibido revalidar datos en Services o Domain.

### Dominio

- Entidades ricas en comportamiento (Rich Domain Model).
- **Toda la lógica de dominio DEBE vivir en Models/Entities**, nunca en Services.
- Services (Use Cases) **solo orquestan** llamadas a Repositories y Entities.
- Lógica de transiciones de estado: **Models**.
- Validaciones de reglas de negocio: **Models**.
- Cálculos derivados del estado: **Models**.
- Services NO deben exponer ni duplicar lógica que pertenece a Entities.
- Las máquinas de estados (FSM) son **explícitas** y viven en el dominio.
- No existen DTOs dentro del dominio.

**Ejemplo correcto:**
```javascript
// ✅ Book.js (Model)
calculateTransition(currentPages, pagesRead) {
  // Lógica de transición aquí
}

// ✅ Service
const transition = book.calculateTransition(currentPages, pagesRead);
```

**Ejemplo incorrecto:**
```javascript
// ❌ Service expone lógica de dominio
if (book.status === WISH_LIST) {
  newStatus = READING; // ¡Esto va en Book model!
}
```

### Errores

- Todo error debe extender `AppError`.
- La jerarquía de errores HTTP es obligatoria.
- **Models/Entities SÍ pueden lanzar Domain Errors** (e.g., `BookClosedError`, `InvalidStateTransitionError`).
- Controllers NO crean errores de dominio (solo capturan y responden).
- Repositories NO conocen HTTP (lanzan errores de dominio, no HTTP).
- Services capturan errores de dominio y los propagan.

**Jerarquía:**
```
AppError (base)
├── HTTP Errors (BadRequestError, NotFoundError, ConflictError...)
└── Domain Errors (BookClosedError, InvalidStateTransitionError...)
```

**Ejemplo correcto:**
```javascript
// ✅ Book.js (Model)
ensureCanAcceptSession() {
  if (this.status === ABANDONED) {
    throw new BookClosedError(this.id, this.status);
  }
}
```

### Transacciones

- Los services controlan las transacciones.
- Los repositories reciben la sesión/transacción como parámetro.
- Cualquier operación que muta múltiples tablas debe ser transaccional.

### Testing

- Patrón AAA obligatorio.
- Cobertura global objetivo: **≥ 70%**.
- Priorizar tests de dominio y services.
- No escribir código complejo sin tests asociados.

---

## Dominio del Negocio

- Las reglas de negocio están definidas en `DOMAIN.md`.
- `DOMAIN.md` es la **Single Source of Truth**.
- No reinterpretar ni simplificar reglas de negocio.
- Ante ambigüedad, preferir el dominio antes que la infraestructura.

---

## Forma de Trabajo Esperada

- Preferir **crear archivos nuevos** antes que modificar código existente.
- Mantener archivos pequeños y responsabilidades claras.
- Nombrar archivos y carpetas de forma explícita y consistente.
- No introducir lógica “temporal” o hacks.

---

## Prohibiciones Explícitas

- No lógica de negocio en controllers.
- No validaciones fuera de Zod.
- No errores lanzados como strings.
- No acceso directo a base de datos fuera de repositories.
- No mezclar capas por conveniencia.
- **NUNCA modificar archivos .md (documentación) sin consultar explícitamente al humano**.
- No crear DTOs innecesarios; usar entidades de dominio directamente cuando sea posible.

---

## Prioridad de Decisión

1. DOMAIN.md
2. AGENTS.md
3. Skills específicos
4. Documentación técnica
5. Código existente

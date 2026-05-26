---
name: mining-procurement-platform
description: >
  Skill maestro para el desarrollo de la plataforma de Outsourcing Estratégico de Compras
  para la industria minera peruana. Úsalo en CUALQUIER tarea de este proyecto: generación
  de código (frontend React, backend FastAPI, esquemas PostgreSQL), diseño de APIs,
  módulos de KPIs/dashboard, flujos procure-to-pay, homologación de proveedores,
  gestión de contratos, optimización de inventario MRO, control de incidencias y
  arquitectura de microservicios en Azure. Triggerea este skill siempre que el usuario
  mencione: compras mineras, proveedores, acuerdos marco, spend analysis, SRM, OTIF,
  homologación, blanket orders, importaciones OEM, dashboard de compras, o cualquier
  componente de este sistema.
---

# Mining Procurement Platform — Skill Maestro

## 1. Visión del Producto

Plataforma SaaS de outsourcing de compras especializada en minería peruana.
Actúa como el **área de compras externalizada** de una empresa minera mediana/grande.

**Stack definitivo:**
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Recharts/ApexCharts
- **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0 (async)
- **Base de datos:** PostgreSQL 16 (principal) + Redis 7 (cache/cola)
- **Infraestructura:** Azure (AKS + Azure Database for PostgreSQL + Azure Cache for Redis)
- **Auth:** Azure AD B2C (SSO para clientes mineros con SAP)
- **Queue:** Celery + Redis para tareas asíncronas (alertas, reportes, benchmarking)
- **Observabilidad:** OpenTelemetry → Azure Monitor + Application Insights

**Antes de escribir código, lee la referencia correspondiente:**
- Arquitectura general → `references/architecture.md`
- Esquema de base de datos → `references/database-schema.md`
- Convenciones de API → `references/api-conventions.md`
- Control de incidencias → `references/incident-control.md`

---

## 2. Módulos del Sistema

### MÓDULO 1 — Gestión Estratégica de Categorías
**Archivos clave:** `backend/app/modules/categories/`, `frontend/src/features/categories/`
- Cuadros de materiales y acuerdos marco (precios fijos anuales/bianuales)
- Seguimiento y renovación de contratos con alertas automáticas
- Spend analysis + clasificación Pareto
- Benchmarking de precios vs. índices CRU/Fastmarkets/LME

### MÓDULO 2 — Sourcing, Licitaciones y Homologación
**Archivos clave:** `backend/app/modules/sourcing/`, `frontend/src/features/sourcing/`
- Homologación técnica/legal/ambiental/ética de proveedores (Ley 29245)
- Flujo completo RFQ/RFP → evaluación técnico-económica → adjudicación
- Scorecard de desempeño (OTIF, calidad, precio vs. mercado)
- Gestión de garantías y reclamos post-venta

### MÓDULO 3 — Compras Operativas e Inventario
**Archivos clave:** `backend/app/modules/procurement/`, `frontend/src/features/procurement/`
- Blanket orders y automatización de compras recurrentes
- Gestión de importaciones OEM (aduana, incoterms, seguros)
- Optimización MRO: puntos de reorden, stock mínimo, stock inmovilizado
- Plataforma SRM: portal de proveedores, OC, facturas, evaluaciones

### MÓDULO 4 — Dashboard Ejecutivo y KPIs
**Archivos clave:** `backend/app/modules/analytics/`, `frontend/src/features/dashboard/`
- KPIs en tiempo real: ahorro generado, % bajo acuerdo marco, OTIF, lead times
- Visibilidad 100% del gasto por categoría/proveedor/unidad minera
- Reportes mensuales automáticos para el cliente
- Alertas: contratos por vencer, stock crítico, proveedor fuera de mercado

### MÓDULO 5 — Servicios de Alto Valor
**Archivos clave:** `backend/app/modules/advisory/`
- Análisis TCO (Total Cost of Ownership)
- Revisión de especificaciones técnicas
- Gestión del riesgo en supply chain
- Digitalización procure-to-pay
- Consultoría y mejora continua

---

## 3. Reglas de Desarrollo — SIEMPRE SEGUIR

### Estructura de carpetas obligatoria
```
project-root/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, seguridad, DB connection, middleware
│   │   ├── modules/        # Un directorio por módulo de negocio
│   │   │   └── {module}/
│   │   │       ├── router.py       # FastAPI router
│   │   │       ├── service.py      # Lógica de negocio
│   │   │       ├── repository.py   # Queries DB (nunca SQL en router/service)
│   │   │       ├── schemas.py      # Pydantic v2 models
│   │   │       ├── models.py       # SQLAlchemy ORM models
│   │   │       └── exceptions.py   # Excepciones del módulo
│   │   ├── shared/         # Utilidades compartidas entre módulos
│   │   └── workers/        # Tareas Celery
│   ├── migrations/         # Alembic migrations
│   ├── tests/              # pytest, estructura espejo de app/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── features/       # Un directorio por módulo de negocio
│   │   ├── shared/         # Componentes, hooks, utils compartidos
│   │   ├── store/          # Zustand stores
│   │   └── api/            # API client (TanStack Query)
│   └── package.json
├── infrastructure/         # Terraform + Helm charts
├── docs/
└── docker-compose.yml      # Solo para desarrollo local
```

### Reglas de código — Backend (FastAPI)
1. **Async siempre:** Todos los endpoints y queries deben ser `async`
2. **Repository pattern:** Nunca escribir SQL raw en routers o services
3. **Pydantic v2:** Usar `model_config = ConfigDict(from_attributes=True)`
4. **Transacciones:** Usar `async with db.begin()` para operaciones multi-tabla
5. **Errores:** Capturar en `exceptions.py` del módulo, nunca en el router
6. **Nunca hardcodear:** Config via `pydantic-settings` desde variables de entorno
7. **Logging estructurado:** `structlog` con contexto de tenant_id, user_id

### Reglas de código — Frontend (React)
1. **TanStack Query:** Para TODA comunicación con el backend (no fetch directo)
2. **Zustand:** Solo para estado global UI (no datos del servidor)
3. **Componentes:** Máximo 200 líneas. Si supera, dividir en sub-componentes
4. **Multi-tenant:** Siempre pasar `tenantId` (empresa minera) en contexto
5. **Error boundaries:** Envolver cada feature con su propio ErrorBoundary
6. **Internacionalización:** i18next preparado desde el inicio (español peruano)

### Reglas de seguridad — CRÍTICAS
1. **Row Level Security (RLS):** Activar en PostgreSQL para cada tabla con datos de cliente
2. **tenant_id:** En CADA tabla con datos de cliente. Nunca omitir en queries
3. **Audit log:** Toda escritura en tablas críticas (contratos, OC, proveedores) debe generar registro en `audit_logs`
4. **PII:** Datos sensibles de proveedores cifrados en reposo (Azure Transparent Data Encryption)
5. **Roles:** RBAC granular — `superadmin`, `client_admin`, `buyer`, `approver`, `viewer`, `supplier`

---

## 4. Convenciones de Naming

```python
# Tablas PostgreSQL: snake_case, plural
purchase_orders, framework_agreements, supplier_evaluations

# Modelos SQLAlchemy: PascalCase, singular
class PurchaseOrder(Base): ...

# Schemas Pydantic: PascalCase + sufijo
class PurchaseOrderCreate(BaseModel): ...
class PurchaseOrderResponse(BaseModel): ...

# Endpoints FastAPI: kebab-case, plural, versioned
GET  /api/v1/purchase-orders
POST /api/v1/purchase-orders
GET  /api/v1/purchase-orders/{order_id}

# Componentes React: PascalCase
PurchaseOrderTable, SpendAnalysisChart

# Stores Zustand: camelCase + Store
usePurchaseOrderStore, useSupplierStore

# Variables de entorno: UPPER_SNAKE_CASE con prefijo APP_
APP_DATABASE_URL, APP_REDIS_URL, APP_AZURE_CLIENT_ID
```

---

## 5. Patrones de Token-Efficiency para Claude Code

Cuando trabajes en este proyecto, sigue estas reglas para minimizar tokens:

### Al leer archivos
- Lee PRIMERO `references/architecture.md` antes de cualquier tarea nueva de arquitectura
- Lee SOLO el módulo relevante, no el proyecto completo
- Usa `view` con `view_range` para leer solo las líneas necesarias

### Al generar código
- Genera un módulo completo a la vez (router + service + repository + schemas)
- No generes archivos de test en el mismo turno que el código principal
- Para migraciones Alembic: genera siempre el script completo, nunca parcial

### Al hacer cambios
- Usa `str_replace` para cambios puntuales, nunca reescribas archivos completos
- Agrupa cambios relacionados en el mismo turno

### Checkpoint obligatorio antes de escribir código
Responde estas 3 preguntas internamente:
1. ¿Qué módulo de negocio es afectado?
2. ¿Requiere migración de DB?
3. ¿Hay impacto en otros módulos (eventos, queues)?

---

## 6. Variables de Entorno Requeridas

```bash
# Core
APP_ENV=development|staging|production
APP_SECRET_KEY=<32 chars min>
APP_DEBUG=false

# Database
APP_DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
APP_DATABASE_POOL_SIZE=20
APP_DATABASE_MAX_OVERFLOW=40

# Redis
APP_REDIS_URL=redis://host:6379/0
APP_CELERY_BROKER_URL=redis://host:6379/1

# Azure AD B2C
APP_AZURE_TENANT_ID=
APP_AZURE_CLIENT_ID=
APP_AZURE_CLIENT_SECRET=

# Azure Storage (documentos de homologación, contratos)
APP_AZURE_STORAGE_ACCOUNT=
APP_AZURE_STORAGE_CONTAINER=

# Integraciones externas
APP_SUNAT_API_KEY=          # Validación RUC proveedores
APP_SAP_WEBHOOK_SECRET=     # Integración ERP cliente

# Observabilidad
APP_APPLICATIONINSIGHTS_CONNECTION_STRING=
APP_LOG_LEVEL=INFO
```

---

## 7. Flujo de Desarrollo por Tarea

```
NUEVA FEATURE:
1. Lee reference del módulo afectado
2. Diseña el modelo DB (migration Alembic)
3. Crea SQLAlchemy model
4. Crea Pydantic schemas
5. Implementa repository (queries)
6. Implementa service (lógica de negocio)
7. Implementa router (endpoints)
8. Crea componente React + TanStack Query hook
9. Agrega al store Zustand si afecta estado global
10. Crea tests (pytest + vitest)

BUG FIX:
1. Revisa references/incident-control.md
2. Identifica módulo afectado
3. Reproduce con test
4. Fix mínimo posible
5. Verifica no hay regresión en módulos dependientes

MIGRACIÓN DB:
1. SIEMPRE hacer backup antes en staging
2. Generar con: alembic revision --autogenerate -m "descripción"
3. Revisar manualmente el script generado
4. Aplicar con: alembic upgrade head
5. Documentar en CHANGELOG.md
```

# Arquitectura — Mining Procurement Platform

## Tabla de Contenidos
1. [Visión General](#1-visión-general)
2. [Diagrama de Componentes](#2-diagrama-de-componentes)
3. [Arquitectura Multi-Tenant](#3-arquitectura-multi-tenant)
4. [Microservicios y Módulos](#4-microservicios-y-módulos)
5. [Flujos Críticos de Negocio](#5-flujos-críticos-de-negocio)
6. [Infraestructura Azure](#6-infraestructura-azure)
7. [Escalabilidad y Resiliencia](#7-escalabilidad-y-resiliencia)
8. [Decisiones de Arquitectura (ADRs)](#8-decisiones-de-arquitectura-adrs)

---

## 1. Visión General

La plataforma es un **SaaS multi-tenant** donde cada tenant es una empresa minera cliente.
El modelo de despliegue es **shared infrastructure, isolated data** usando PostgreSQL Row Level Security.

```
Cliente Minero A ──┐
Cliente Minero B ──┤──► API Gateway (Azure APIM) ──► Backend FastAPI ──► PostgreSQL (RLS)
Cliente Minero C ──┘                                        │
                                                            ├──► Redis (cache + queues)
                                                            ├──► Azure Blob (docs)
                                                            └──► Celery Workers
```

**Principio central:** El sistema debe funcionar correctamente aunque un cliente minero no tenga ERP moderno. Somos el sistema de registro de compras, no dependemos del ERP del cliente.

---

## 2. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Dashboard  │  │  Procurement │  │   Supplier Portal      │ │
│  │  Ejecutivo  │  │  Operativo   │  │   (portal externo)     │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS + JWT
┌───────────────────────────▼─────────────────────────────────────┐
│                    API Gateway (Azure APIM)                      │
│          Rate limiting · Auth validation · Routing               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Backend FastAPI (AKS)                         │
│                                                                  │
│  /api/v1/categories   /api/v1/sourcing   /api/v1/procurement    │
│  /api/v1/analytics    /api/v1/suppliers  /api/v1/contracts      │
│  /api/v1/inventory    /api/v1/advisory   /api/v1/audit          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Celery Workers (Background Tasks)             │  │
│  │  · Alertas de vencimiento de contratos                    │  │
│  │  · Generación de reportes mensuales PDF                   │  │
│  │  · Benchmarking automático vs. índices LME/CRU            │  │
│  │  · Notificaciones de stock crítico                        │  │
│  │  · Scoring periódico de proveedores                       │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────┬───────────────────┬──────────────────────┬──────────────┘
         │                   │                      │
    ┌────▼────┐         ┌────▼────┐           ┌─────▼─────┐
    │ Postgres│         │  Redis  │           │Azure Blob │
    │   16    │         │    7    │           │ Storage   │
    │  (RLS)  │         │cache+Q  │           │ (docs)    │
    └─────────┘         └─────────┘           └───────────┘
```

---

## 3. Arquitectura Multi-Tenant

### Estrategia: Shared DB + Row Level Security

**Cada tabla con datos de cliente tiene `tenant_id UUID NOT NULL`.**

```sql
-- Ejemplo de RLS policy
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON purchase_orders
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- El backend setea esto al inicio de cada request
SET LOCAL app.current_tenant = '{{tenant_uuid}}';
```

### Middleware de Tenant (FastAPI)

```python
# backend/app/core/middleware/tenant.py
class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        tenant_id = extract_tenant_from_jwt(request)
        if not tenant_id:
            raise HTTPException(status_code=401)
        request.state.tenant_id = tenant_id
        # Setear en la DB session para RLS
        async with get_db() as db:
            await db.execute(
                text("SET LOCAL app.current_tenant = :tid"),
                {"tid": str(tenant_id)}
            )
        return await call_next(request)
```

### Jerarquía de Roles por Tenant

```
Tenant (Empresa Minera)
└── client_admin       → Ve todo del tenant, gestiona usuarios
    ├── buyer          → Crea y gestiona OC, licitaciones
    ├── approver       → Aprueba OC según límites de autorización
    └── viewer         → Solo lectura (dashboard ejecutivo)

Platform Level
└── superadmin         → Acceso cross-tenant (solo equipo interno)
    └── analyst        → Acceso read-only cross-tenant para benchmarking

Externo
└── supplier           → Solo portal de proveedores (sin acceso al sistema principal)
```

---

## 4. Microservicios y Módulos

En esta fase, el backend es un **monolito modular** (no microservicios puros).
La estructura modular permite extraer servicios cuando el volumen lo justifique.

### Módulos y sus responsabilidades

| Módulo | Responsabilidad | Eventos emitidos |
|--------|----------------|-----------------|
| `categories` | Acuerdos marco, cuadros materiales, benchmarking | `agreement.expiring`, `price.outOfMarket` |
| `sourcing` | RFQ/RFP, licitaciones, homologación | `supplier.qualified`, `tender.awarded` |
| `procurement` | OC, blanket orders, importaciones OEM | `order.created`, `order.approved`, `order.received` |
| `inventory` | MRO, stock mínimo, puntos de reorden | `stock.critical`, `stock.immobilized` |
| `analytics` | Spend analysis, KPIs, reportes | `report.generated` |
| `suppliers` | Portal de proveedores, documentos | `supplier.documentUploaded` |
| `contracts` | Contratos, vencimientos, alertas | `contract.expiring30d`, `contract.expired` |
| `advisory` | TCO, especificaciones, riesgo supply chain | — |
| `audit` | Registro de auditoría inmutable | — (consume eventos de otros módulos) |
| `notifications` | Email, WhatsApp Business API, in-app | — (consume eventos) |

### Comunicación entre módulos

**Dentro del monolito:** Llamadas directas entre services (inyección de dependencias).
**Eventos asíncronos:** Redis pub/sub para notificaciones y tareas de larga duración.

```python
# Patrón de evento interno
# backend/app/shared/events.py
class EventBus:
    async def publish(self, event: str, payload: dict, tenant_id: UUID):
        await redis.publish(
            channel=f"tenant:{tenant_id}:{event}",
            message=json.dumps({"event": event, "payload": payload, "ts": utcnow()})
        )
```

---

## 5. Flujos Críticos de Negocio

### Flujo Procure-to-Pay (P2P)

```
Solicitud de Compra (PR)
    │
    ▼
Validación de presupuesto
    │
    ├─► ¿Existe acuerdo marco vigente? ──SÍ──► Blanket Order (1-2 días)
    │                                              │
    └─► NO ──► Licitación RFQ/RFP (5-15 días) ───┘
                    │
                    ▼
              Evaluación técnico-económica
                    │
                    ▼
              Adjudicación + Orden de Compra (OC)
                    │
                    ▼
              ¿Importación? ──SÍ──► Gestión OEM (aduana, incoterms)
                    │
                    ▼
              Recepción en almacén mina
                    │
                    ▼
              Conformidad técnica
                    │
                    ▼
              Factura → Pago (3-way match: OC + Recepción + Factura)
                    │
                    ▼
              Registro en audit_log + KPIs actualizados
```

### Flujo de Alerta de Contrato por Vencer

```
Celery Beat (diario 06:00 PET)
    │
    ▼
check_expiring_contracts()
    │
    ├─► 60 días antes: Alerta a buyer → iniciar renegociación
    ├─► 30 días antes: Alerta a client_admin
    └─► 7 días antes:  Alerta crítica + notificación WhatsApp a gerencia
```

### Flujo de Homologación de Proveedor

```
Registro proveedor (datos básicos + RUC)
    │
    ▼
Validación automática SUNAT API (estado tributario, deudas)
    │
    ▼
Upload documentos (SUNAT, OSCE, ISO 14001, ISO 45001, etc.)
    │
    ▼
Revisión interna (buyer/analyst)
    │
    ▼
Scorecard inicial (financiero + técnico + legal + ético)
    │
    ├─► Score >= 70: HOMOLOGADO → ingresa a base de proveedores
    ├─► Score 50-69: CONDICIONAL → plan de mejora 90 días
    └─► Score < 50:  RECHAZADO → notificación con razones
```

---

## 6. Infraestructura Azure

### Recursos Azure requeridos

```yaml
# Producción
Compute:
  - Azure Kubernetes Service (AKS): 3 nodos Standard_D4s_v3
  - Backend pods: 3-10 réplicas (HPA por CPU/memory)
  - Worker pods: 2-5 réplicas (HPA por queue depth)

Database:
  - Azure Database for PostgreSQL Flexible Server
    - SKU: Standard_D4ds_v5 (4 vCores, 16 GB RAM)
    - Storage: 512 GB Premium SSD
    - HA: Zone-redundant standby
    - Backups: 7 días retención, geo-redundant

Cache/Queue:
  - Azure Cache for Redis (Standard C2: 6 GB)

Storage:
  - Azure Blob Storage (LRS para documentos de proveedores, contratos)
  - Lifecycle policy: tier to Cool después de 90 días

Security:
  - Azure Key Vault (secretos y certificados)
  - Azure AD B2C (autenticación clientes)
  - Azure APIM (API Gateway con rate limiting)

Observabilidad:
  - Azure Application Insights
  - Azure Monitor (alertas operacionales)
  - Log Analytics Workspace

CDN:
  - Azure Static Web Apps (frontend React)
  - Azure CDN para assets estáticos
```

### Escalado automático

```yaml
# HPA para backend FastAPI
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    name: backend-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: External
    external:
      metric:
        name: azure_apim_requests_per_minute
      target:
        type: AverageValue
        averageValue: "1000"
```

---

## 7. Escalabilidad y Resiliencia

### Circuit Breakers

Implementar en integraciones externas (SUNAT API, índices LME/CRU):

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
async def get_sunat_ruc_info(ruc: str) -> SunatResponse:
    ...
```

### Retry Policy para operaciones críticas

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def send_critical_alert(notification: Notification):
    ...
```

### Health Checks

```python
# GET /health → para Kubernetes liveness probe
# GET /health/ready → para Kubernetes readiness probe
# GET /health/startup → para Kubernetes startup probe

@router.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}

@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    await redis_client.ping()
    return {"status": "ready"}
```

### SLOs definidos para el producto

| Métrica | Objetivo |
|---------|---------|
| Disponibilidad API | 99.5% mensual |
| P95 latencia endpoints de lectura | < 200ms |
| P95 latencia endpoints de escritura | < 500ms |
| Tiempo de respuesta alertas críticas | < 5 min |
| RTO (Recovery Time Objective) | < 1 hora |
| RPO (Recovery Point Objective) | < 15 min |

---

## 8. Decisiones de Arquitectura (ADRs)

### ADR-001: Monolito modular vs. Microservicios
**Decisión:** Monolito modular en fase inicial.
**Razón:** El equipo es pequeño, los módulos están altamente acoplados (spend analysis necesita datos de contratos, OC y proveedores simultáneamente). Extraer microservicios cuando un módulo específico necesite escalar independientemente.

### ADR-002: Row Level Security vs. DB por tenant
**Decisión:** RLS en DB compartida.
**Razón:** El número esperado de tenants (10-50 mineras) no justifica el overhead operativo de múltiples instancias de DB. RLS es suficiente para el aislamiento requerido.

### ADR-003: FastAPI vs. Django
**Decisión:** FastAPI.
**Razón:** El análisis de datos (TCO, benchmarking, MRO optimization) requiere integración con librerías Python data science (pandas, scipy). FastAPI async es mejor para los picos de carga en procesamiento de reportes.

### ADR-004: Azure vs. AWS
**Decisión:** Azure.
**Razón:** Las empresas mineras peruanas grandes (Buenaventura, Southern Copper) usan SAP en Azure. Azure AD B2C facilita el SSO. Azure Database for PostgreSQL tiene mejor SLA en LATAM que RDS.

### ADR-005: PostgreSQL vs. TimescaleDB para KPIs
**Decisión:** PostgreSQL estándar con particionamiento por fecha.
**Razón:** TimescaleDB agrega complejidad operativa. PostgreSQL 16 con table partitioning por mes es suficiente para el volumen esperado (< 10M registros de OC en 3 años).

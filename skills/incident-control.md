# Control de Incidencias — Mining Procurement Platform

## Tabla de Contenidos
1. [Clasificación de Incidencias](#1-clasificación-de-incidencias)
2. [Proceso de Respuesta](#2-proceso-de-respuesta)
3. [Observabilidad y Alertas](#3-observabilidad-y-alertas)
4. [Runbooks por Tipo de Incidencia](#4-runbooks-por-tipo-de-incidencia)
5. [Post-Mortem y Mejora Continua](#5-post-mortem-y-mejora-continua)
6. [SLOs y Error Budget](#6-slos-y-error-budget)

---

## 1. Clasificación de Incidencias

### Severity 1 — CRÍTICO 🔴
**Impacto:** Plataforma completamente inoperativa o pérdida de datos.
**SLA respuesta:** < 15 minutos
**SLA resolución:** < 2 horas

Ejemplos:
- API completamente caída (0% disponibilidad)
- Base de datos inaccesible
- Pérdida o corrupción de datos de OC o contratos
- Brecha de seguridad / acceso cross-tenant (¡MÁXIMA PRIORIDAD!)
- Parada de producción en mina cliente por falta de respuesta del sistema

### Severity 2 — ALTO 🟠
**Impacto:** Funcionalidad crítica degradada para uno o más clientes.
**SLA respuesta:** < 1 hora
**SLA resolución:** < 8 horas

Ejemplos:
- Un módulo completo no funciona (ej: no se pueden crear OC)
- Alertas de contratos no enviándose
- Dashboard de KPIs desactualizado por > 2 horas
- Portal de proveedores caído
- Integración SUNAT fallando (bloquea homologaciones)

### Severity 3 — MEDIO 🟡
**Impacto:** Funcionalidad degradada pero workaround disponible.
**SLA respuesta:** < 4 horas
**SLA resolución:** < 48 horas

Ejemplos:
- Reportes PDF tardando > 10 minutos en generarse
- Filtros de búsqueda lentos (> 3 segundos)
- Exportación Excel fallando
- Notificaciones con retraso > 30 minutos

### Severity 4 — BAJO 🟢
**Impacto:** Bug menor sin impacto operativo significativo.
**SLA respuesta:** < 24 horas
**SLA resolución:** Próximo sprint

Ejemplos:
- Error cosmético en UI
- Mensaje de error poco descriptivo
- Feature menor no funciona en caso edge

---

## 2. Proceso de Respuesta

### Flujo de respuesta a incidencia

```
DETECCIÓN (automatizada o usuario)
    │
    ▼
TRIAGE (< 15 min para S1/S2)
    ├─► ¿Qué módulo? → Ver runbook del módulo
    ├─► ¿Cuántos tenants afectados?
    └─► Clasificar severity
    │
    ▼
COMUNICACIÓN
    ├─► S1/S2: Notificar a todos los tenants afectados (email + WhatsApp)
    ├─► S1: Escalar a CTO inmediatamente
    └─► Actualizar status page (https://status.minprocure.pe)
    │
    ▼
MITIGACIÓN (reducir impacto mientras se investiga causa raíz)
    ├─► Rollback si el incidente fue causado por deploy
    ├─► Escalar pods si es problema de carga
    └─► Activar modo mantenimiento si es necesario
    │
    ▼
RESOLUCIÓN
    │
    ▼
POST-MORTEM (obligatorio para S1 y S2)
    └─► Documentar en /docs/post-mortems/YYYY-MM-DD-titulo.md
```

### Canales de comunicación interna (incidencia)

```
S1: WhatsApp grupal "🔴 INCIDENCIAS CRÍTICAS" + llamada directa
S2: WhatsApp grupal + Slack #incidents
S3: Slack #incidents
S4: Jira ticket
```

### Template de comunicación al cliente (S1/S2)

```
Asunto: [Urgente] Incidencia en plataforma MinProcure — {fecha}

Estimado equipo de {cliente},

Estamos experimentando una incidencia que puede estar afectando
su acceso a {módulo afectado}.

Estado actual: Investigando | Mitigando | Resuelto
Impacto estimado: {descripción breve}
Inicio del incidente: {hora PET}
Próxima actualización: En {X} minutos

Nuestro equipo está trabajando en la resolución. Les notificaremos
en cuanto tengamos una actualización o resolución.

Disculpen los inconvenientes.

Equipo MinProcure
```

---

## 3. Observabilidad y Alertas

### Stack de observabilidad

```python
# backend/app/core/telemetry.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from azure.monitor.opentelemetry import configure_azure_monitor

# Configuración en startup
configure_azure_monitor(
    connection_string=settings.APP_APPLICATIONINSIGHTS_CONNECTION_STRING
)

# Logging estructurado
import structlog

logger = structlog.get_logger()

# En cada request, bindear contexto
logger.bind(
    tenant_id=str(request.state.tenant_id),
    user_id=str(request.state.user_id),
    request_id=str(request.state.request_id),
    module="procurement"
)
```

### Alertas configuradas en Azure Monitor

| Alerta | Condición | Severity | Acción |
|--------|-----------|---------|--------|
| API Down | Disponibilidad < 99% en 5 min | S1 | PagerDuty + WhatsApp |
| High Error Rate | Error 5xx > 5% en 5 min | S1 | PagerDuty |
| DB Connection Pool | Connections > 80% del pool | S2 | Slack |
| Redis Memory | > 80% memoria usada | S2 | Slack |
| Slow Queries | P95 latencia > 1s | S2 | Slack |
| Celery Queue Depth | > 1000 tareas pendientes | S2 | Slack |
| Contract Expiry Alert | Contratos vencen en 7 días | S3 | Email a client_admin |
| Critical Stock | Ítem bajo punto de reorden | S3 | Email a buyer |
| Failed SUNAT Validation | > 10 fallos en 1h | S3 | Slack |

### Métricas custom a trackear (Azure Application Insights)

```python
# Métricas de negocio — trackear en cada operación clave
from applicationinsights import TelemetryClient

tc = TelemetryClient(settings.APP_APPLICATIONINSIGHTS_CONNECTION_STRING)

# Al crear una OC
tc.track_metric("po.created", 1, properties={
    "tenant_id": str(tenant_id),
    "po_type": po_type,
    "is_emergency": is_emergency,
    "has_agreement": has_agreement
})

# Al generar ahorro
tc.track_metric("savings.generated", savings_amount, properties={
    "tenant_id": str(tenant_id),
    "category": category_name
})

# Al homologar proveedor
tc.track_metric("supplier.qualified", 1, properties={
    "tenant_id": str(tenant_id),
    "score": qualification_score
})
```

### Dashboard de Observabilidad (Azure Monitor Workbook)

Mantener un workbook con:
1. **Salud del sistema:** Disponibilidad, error rates, latencia P50/P95/P99
2. **Actividad por tenant:** OC creadas, proveedores homologados, contratos activos
3. **Performance de DB:** Query lenta más frecuentes, connection pool usage
4. **Celery Workers:** Tasks completadas, fallidas, tiempo de procesamiento

---

## 4. Runbooks por Tipo de Incidencia

### RB-001: API completamente caída

```bash
# 1. Verificar estado de pods en AKS
kubectl get pods -n production -l app=backend
kubectl describe pod <pod-name> -n production

# 2. Ver logs del pod
kubectl logs <pod-name> -n production --tail=200

# 3. Si crashloop: ver eventos
kubectl get events -n production --sort-by='.lastTimestamp'

# 4. Rollback al deploy anterior
kubectl rollout undo deployment/backend -n production
kubectl rollout status deployment/backend -n production

# 5. Verificar health
curl https://api.minprocure.pe/health
curl https://api.minprocure.pe/health/ready
```

### RB-002: Base de datos inaccesible

```bash
# 1. Verificar estado en Azure Portal
az postgres flexible-server show \
  --resource-group rg-minprocure-prod \
  --name psql-minprocure-prod \
  --query "state"

# 2. Verificar conexión desde el backend pod
kubectl exec -it <backend-pod> -n production -- \
  python -c "import asyncpg; import asyncio; \
  asyncio.run(asyncpg.connect('${APP_DATABASE_URL}'))"

# 3. Si es failover a standby (HA)
# Azure lo maneja automáticamente — esperar 30-120 segundos
# Verificar en Azure Portal: PostgreSQL > Overview > Status

# 4. Si las conexiones están agotadas
# Reiniciar PgBouncer o aumentar pool size temporalmente
kubectl set env deployment/backend \
  APP_DATABASE_POOL_SIZE=30 -n production

# 5. Verificar queries largas bloqueando
# (desde una conexión de emergencia a la DB)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '30 seconds'
ORDER BY duration DESC;

# Para terminar query bloqueante
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <pid>;
```

### RB-003: Acceso cross-tenant detectado (CRÍTICO DE SEGURIDAD)

```bash
# 1. INMEDIATAMENTE: Activar modo mantenimiento
kubectl set env deployment/backend APP_MAINTENANCE_MODE=true -n production

# 2. Revocar todos los tokens activos (en Redis)
redis-cli -u ${APP_REDIS_URL} FLUSHDB  # ¡CUIDADO! Borra toda la cache

# 3. Identificar el alcance del incidente
# Revisar audit_logs de los últimos 24h para el tenant afectado
SELECT * FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND (tenant_id != expected_tenant OR actor_id IN (suspect_users))
ORDER BY created_at DESC;

# 4. Notificar a TODOS los tenants afectados
# 5. Iniciar proceso de análisis forense
# 6. Notificar a DPA si hay datos personales comprometidos (Ley 29733 Perú)

# 7. Una vez mitigado: deshabilitar usuarios sospechosos
UPDATE users SET is_active = false WHERE id IN (suspect_user_ids);
```

### RB-004: Alertas de contratos no enviándose

```bash
# 1. Verificar estado de Celery workers
kubectl get pods -n production -l app=celery-worker
kubectl logs <celery-pod> -n production --tail=100

# 2. Verificar la queue en Redis
redis-cli -u ${APP_REDIS_URL} LLEN celery

# 3. Verificar que la tarea está siendo schedulada
# Conectar a un worker y verificar
kubectl exec -it <celery-pod> -n production -- \
  celery -A app.workers inspect scheduled

# 4. Ejecutar tarea manualmente si es urgente
kubectl exec -it <celery-pod> -n production -- \
  python -c "
from app.workers.tasks import check_expiring_contracts
check_expiring_contracts.apply(args=['tenant_id_here'])
"

# 5. Reiniciar workers si están en estado inconsistente
kubectl rollout restart deployment/celery-worker -n production
```

### RB-005: Performance degradada (queries lentas)

```sql
-- 1. Identificar queries lentas en tiempo real
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Ver índices no usados (candidatos a eliminar)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- 3. Ver tablas con más table scans (faltan índices)
SELECT schemaname, tablename, seq_scan, seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC;

-- 4. EXPLAIN ANALYZE de la query problemática
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ... -- query problemática aquí
;
```

---

## 5. Post-Mortem y Mejora Continua

### Template de Post-Mortem

```markdown
# Post-Mortem: {Título del Incidente}
**Fecha:** YYYY-MM-DD
**Severity:** S1 | S2
**Duración:** X horas Y minutos
**Tenants afectados:** N

## Resumen ejecutivo
{2-3 oraciones describiendo qué pasó y cuál fue el impacto}

## Timeline
| Hora (PET) | Evento |
|------------|--------|
| HH:MM | Incidente inicia (detección automática / reporte de usuario) |
| HH:MM | Triage completado, severity clasificada |
| HH:MM | Causa raíz identificada |
| HH:MM | Mitigación aplicada |
| HH:MM | Servicio restaurado |
| HH:MM | Post-mortem iniciado |

## Causa Raíz
{Descripción técnica precisa de qué causó el incidente.
Usar los "5 porqués" para llegar a la causa raíz real.}

## ¿Por qué no lo detectamos antes?
{Análisis honesto de las brechas en monitoreo}

## Impacto
- Tenants afectados: N
- Tiempo de downtime: X minutos
- Operaciones fallidas: N OC, N homologaciones, etc.
- Impacto económico estimado: {si aplica}

## Acciones correctivas (con dueño y fecha)
| # | Acción | Dueño | Fecha límite | Estado |
|---|--------|-------|-------------|--------|
| 1 | Agregar alerta para X | @dev | YYYY-MM-DD | Pendiente |
| 2 | Agregar test de regresión para Y | @dev | YYYY-MM-DD | Pendiente |

## Lecciones aprendidas
- {Qué hicimos bien en la respuesta}
- {Qué podemos mejorar}
- {Qué herramientas/procesos necesitamos}
```

---

## 6. SLOs y Error Budget

### SLOs definidos

| SLO | Target | Ventana | Error Budget mensual |
|-----|--------|---------|---------------------|
| Disponibilidad API | 99.5% | 30 días | 3h 36min de downtime |
| Latencia P95 lectura | < 200ms | 7 días | — |
| Latencia P95 escritura | < 500ms | 7 días | — |
| Alertas de contrato enviadas | 99% | 30 días | 1% de alertas pueden fallar |
| Reportes PDF generados | 95% en < 5min | 7 días | 5% pueden tardar más |

### Política de Error Budget

- **Error budget > 50% restante:** Deploy normal permitido
- **Error budget 25-50% restante:** Deploy con aprobación adicional
- **Error budget < 25% restante:** Solo bugfixes críticos, NO nuevas features
- **Error budget agotado:** Feature freeze hasta recuperar el budget

### Medición de disponibilidad

```python
# Synthetic monitoring — ping cada 1 minuto desde Azure
# Si falla 3 veces consecutivas → alerta S1

# Cálculo de disponibilidad
uptime_pct = (total_minutes - downtime_minutes) / total_minutes * 100

# Downtime cuenta cuando:
# - HTTP 5xx rate > 25% durante > 2 minutos consecutivos
# - Latencia P95 > 5 segundos durante > 5 minutos consecutivos
# - No cuenta: mantenimiento programado (máx 4h/mes, avisado con 48h)
```

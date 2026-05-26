# Convenciones de API — Mining Procurement Platform

## Tabla de Contenidos
1. [Estructura de Respuesta](#1-estructura-de-respuesta)
2. [Paginación](#2-paginación)
3. [Filtros y Búsqueda](#3-filtros-y-búsqueda)
4. [Manejo de Errores](#4-manejo-de-errores)
5. [Autenticación y Headers](#5-autenticación-y-headers)
6. [Endpoints por Módulo](#6-endpoints-por-módulo)
7. [Webhooks para ERP del Cliente](#7-webhooks-para-erp-del-cliente)
8. [Versionamiento](#8-versionamiento)

---

## 1. Estructura de Respuesta

### Éxito — Objeto único
```json
{
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Éxito — Lista paginada
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 145,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Error
```json
{
  "error": {
    "code": "AGREEMENT_NOT_FOUND",
    "message": "El acuerdo marco solicitado no existe o no pertenece a tu organización.",
    "detail": null,
    "field_errors": null    // para errores de validación
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Error de Validación (422)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados contienen errores.",
    "field_errors": [
      { "field": "end_date", "message": "La fecha de fin debe ser posterior a la fecha de inicio." },
      { "field": "supplier_id", "message": "El proveedor no está homologado para esta categoría." }
    ]
  }
}
```

### Schema Pydantic base
```python
# backend/app/shared/schemas.py
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class BaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class MetaSchema(BaseModel):
    request_id: UUID
    timestamp: datetime

class PaginationSchema(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool

class ApiResponse(BaseModel):
    data: Any
    meta: MetaSchema

class PaginatedResponse(BaseModel):
    data: list[Any]
    pagination: PaginationSchema
    meta: MetaSchema

class ErrorDetail(BaseModel):
    field: str
    message: str

class ApiError(BaseModel):
    code: str
    message: str
    detail: str | None = None
    field_errors: list[ErrorDetail] | None = None

class ErrorResponse(BaseModel):
    error: ApiError
    meta: MetaSchema
```

---

## 2. Paginación

**Query params estándar para todos los endpoints de lista:**
```
?page=1&page_size=20&sort_by=created_at&sort_dir=desc
```

**Valores por defecto:** `page=1`, `page_size=20`, `sort_dir=desc`
**Máximo page_size:** 100

```python
# backend/app/shared/pagination.py
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = "created_at"
    sort_dir: Literal["asc", "desc"] = "desc"

async def paginate(
    query: Select,
    db: AsyncSession,
    params: PaginationParams,
    response_model: type[BaseResponse]
) -> PaginatedResponse:
    # Contar total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Aplicar paginación
    offset = (params.page - 1) * params.page_size
    results = await db.execute(
        query.offset(offset).limit(params.page_size)
    )
    ...
```

---

## 3. Filtros y Búsqueda

### Convención de filtros en query params
```
# Texto: búsqueda parcial (ILIKE)
?search=reactivos

# Estado: exacto
?status=active

# Fecha: rango
?date_from=2025-01-01&date_to=2025-03-31

# Múltiples valores: coma separada
?category_ids=uuid1,uuid2,uuid3

# Booleano
?is_emergency=true

# Rango numérico
?amount_min=10000&amount_max=500000
```

### Filtros estándar disponibles en endpoints de lista
Todos los endpoints de lista aceptan:
- `search`: búsqueda en campos de texto principales
- `status`: filtro por estado
- `created_from` / `created_to`: rango de fecha de creación
- `supplier_id`: filtrar por proveedor específico

---

## 4. Manejo de Errores

### Códigos de error del dominio
```python
# backend/app/shared/exceptions.py

class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code

# Errores por módulo — usar estos codes en las respuestas
class ErrorCodes:
    # Auth
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    TENANT_SUSPENDED = "TENANT_SUSPENDED"

    # Proveedores
    SUPPLIER_NOT_FOUND = "SUPPLIER_NOT_FOUND"
    SUPPLIER_NOT_QUALIFIED = "SUPPLIER_NOT_QUALIFIED"
    SUPPLIER_SUSPENDED = "SUPPLIER_SUSPENDED"
    RUC_ALREADY_EXISTS = "RUC_ALREADY_EXISTS"
    SUNAT_VALIDATION_FAILED = "SUNAT_VALIDATION_FAILED"

    # Acuerdos Marco
    AGREEMENT_NOT_FOUND = "AGREEMENT_NOT_FOUND"
    AGREEMENT_EXPIRED = "AGREEMENT_EXPIRED"
    AGREEMENT_OVERLAP = "AGREEMENT_OVERLAP"

    # Órdenes de Compra
    PO_NOT_FOUND = "PO_NOT_FOUND"
    PO_APPROVAL_REQUIRED = "PO_APPROVAL_REQUIRED"
    PO_CANNOT_MODIFY = "PO_CANNOT_MODIFY"
    BUDGET_EXCEEDED = "BUDGET_EXCEEDED"

    # Inventario
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
    ITEM_NOT_FOUND = "ITEM_NOT_FOUND"

    # General
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
```

### Handler global de excepciones
```python
# backend/app/core/exception_handlers.py

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ApiError(code=exc.code, message=exc.message),
            meta=MetaSchema(request_id=request.state.request_id, timestamp=utcnow())
        ).model_dump()
    )

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    field_errors = [
        ErrorDetail(field=".".join(str(l) for l in e["loc"][1:]), message=e["msg"])
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error=ApiError(
                code=ErrorCodes.VALIDATION_ERROR,
                message="Los datos enviados contienen errores.",
                field_errors=field_errors
            ),
            meta=...
        ).model_dump()
    )
```

---

## 5. Autenticación y Headers

### Headers requeridos en cada request
```http
Authorization: Bearer <jwt_token>
X-Tenant-ID: <tenant_uuid>          # redundante con JWT, pero útil para APIM routing
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>                # generado por el cliente para trazabilidad
```

### Estructura del JWT (Azure AD B2C)
```json
{
  "sub": "user_uuid",
  "email": "comprador@minera.pe",
  "tenant_id": "tenant_uuid",
  "role": "buyer",
  "iat": 1705312200,
  "exp": 1705315800,
  "iss": "https://login.microsoftonline.com/{tenant}/v2.0"
}
```

### Dependency de autenticación en FastAPI
```python
# backend/app/core/auth.py
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    payload = verify_azure_jwt(token)
    user = await user_repo.get_by_azure_id(db, payload["sub"])
    if not user or not user.is_active:
        raise AppError(ErrorCodes.UNAUTHORIZED, "Token inválido.", 401)
    return user

async def require_role(*roles: str):
    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise AppError(ErrorCodes.FORBIDDEN, "No tienes permisos para esta acción.", 403)
        return current_user
    return checker

# Uso en router
@router.post("/purchase-orders")
async def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user: User = Depends(require_role("buyer", "client_admin"))
):
    ...
```

---

## 6. Endpoints por Módulo

### Módulo: Framework Agreements
```
GET    /api/v1/framework-agreements                    # Lista con filtros
POST   /api/v1/framework-agreements                    # Crear
GET    /api/v1/framework-agreements/{id}               # Detalle
PATCH  /api/v1/framework-agreements/{id}               # Actualizar
DELETE /api/v1/framework-agreements/{id}               # Soft delete
GET    /api/v1/framework-agreements/{id}/items         # Ítems del acuerdo
POST   /api/v1/framework-agreements/{id}/renew         # Renovar acuerdo
GET    /api/v1/framework-agreements/expiring           # Próximos a vencer
```

### Módulo: Suppliers
```
GET    /api/v1/suppliers                               # Lista
POST   /api/v1/suppliers                               # Registrar
GET    /api/v1/suppliers/{id}                          # Detalle
PATCH  /api/v1/suppliers/{id}                          # Actualizar
GET    /api/v1/suppliers/{id}/qualifications           # Historial homologación
POST   /api/v1/suppliers/{id}/qualify                  # Iniciar homologación
POST   /api/v1/suppliers/{id}/documents                # Upload documento
GET    /api/v1/suppliers/{id}/scorecards               # Evaluaciones
POST   /api/v1/suppliers/{id}/scorecards               # Nueva evaluación
GET    /api/v1/suppliers/validate-ruc/{ruc}            # Validar en SUNAT
```

### Módulo: Purchase Orders
```
GET    /api/v1/purchase-orders                         # Lista
POST   /api/v1/purchase-orders                         # Crear
GET    /api/v1/purchase-orders/{id}                    # Detalle
PATCH  /api/v1/purchase-orders/{id}                    # Actualizar (solo en draft)
POST   /api/v1/purchase-orders/{id}/submit             # Enviar a aprobación
POST   /api/v1/purchase-orders/{id}/approve            # Aprobar
POST   /api/v1/purchase-orders/{id}/reject             # Rechazar
POST   /api/v1/purchase-orders/{id}/cancel             # Cancelar
POST   /api/v1/purchase-orders/{id}/receive            # Registrar recepción
GET    /api/v1/purchase-orders/{id}/audit-trail        # Historial de cambios
```

### Módulo: Analytics
```
GET    /api/v1/analytics/spend-summary                 # Resumen de gasto
GET    /api/v1/analytics/spend-by-category             # Por categoría
GET    /api/v1/analytics/spend-by-supplier             # Por proveedor (Pareto)
GET    /api/v1/analytics/kpis/current                  # KPIs del período actual
GET    /api/v1/analytics/kpis/trend                    # Tendencia histórica
GET    /api/v1/analytics/savings                       # Ahorro generado
POST   /api/v1/analytics/reports/generate              # Genera reporte PDF (async)
GET    /api/v1/analytics/reports/{report_id}           # Estado y descarga del reporte
```

### Módulo: Inventory MRO
```
GET    /api/v1/inventory                               # Lista ítems
POST   /api/v1/inventory                               # Crear ítem
GET    /api/v1/inventory/{id}                          # Detalle
PATCH  /api/v1/inventory/{id}                          # Actualizar
GET    /api/v1/inventory/critical-stock                # Ítems bajo punto de reorden
GET    /api/v1/inventory/immobilized                   # Stock sin movimiento 90+ días
POST   /api/v1/inventory/{id}/movement                 # Registrar movimiento
POST   /api/v1/inventory/optimize-reorder-points       # Recalcular POPs (async)
```

---

## 7. Webhooks para ERP del Cliente

Para sincronizar con SAP u Oracle del cliente minero.

### Eventos que se envían al ERP del cliente
```json
{
  "event": "purchase_order.approved",
  "tenant_id": "uuid",
  "timestamp": "2025-01-15T10:30:00Z",
  "payload": {
    "po_number": "OC-2025-0042",
    "supplier_ruc": "20123456789",
    "total_amount": 150000.00,
    "currency": "USD",
    "items": [ ... ]
  },
  "signature": "hmac_sha256_signature"   // para verificar autenticidad
}
```

### Eventos disponibles
- `purchase_order.approved`
- `purchase_order.received`
- `supplier.qualified`
- `contract.expiring`
- `invoice.matched`         (3-way match completado)

### Configuración de webhook por tenant
```
POST /api/v1/settings/webhooks          # Registrar endpoint del cliente
GET  /api/v1/settings/webhooks          # Ver configuración
POST /api/v1/settings/webhooks/test     # Enviar evento de prueba
```

---

## 8. Versionamiento

**URL versioning:** `/api/v1/`, `/api/v2/`

**Política de deprecación:**
- Una versión se anuncia como deprecated con 6 meses de anticipación
- Se envía header `Deprecation: true` y `Sunset: <fecha>` en responses
- Máximo 2 versiones activas simultáneamente

**Breaking changes que requieren nueva versión:**
- Eliminar un campo de la respuesta
- Cambiar el tipo de un campo
- Cambiar el comportamiento de un filtro
- Cambiar códigos de error existentes

**Non-breaking (se puede hacer en v1):**
- Agregar nuevos campos opcionales
- Agregar nuevos endpoints
- Agregar nuevos filtros opcionales

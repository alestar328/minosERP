# Esquema de Base de Datos — Mining Procurement Platform

## Convenciones globales

```sql
-- Toda tabla tiene estas columnas base
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id   UUID NOT NULL REFERENCES tenants(id)
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
created_by  UUID REFERENCES users(id)
is_deleted  BOOLEAN NOT NULL DEFAULT FALSE  -- soft delete siempre
```

**Índices obligatorios en toda tabla:**
```sql
CREATE INDEX ON {table} (tenant_id);
CREATE INDEX ON {table} (tenant_id, created_at DESC);
CREATE INDEX ON {table} (tenant_id, is_deleted) WHERE NOT is_deleted;
```

---

## Tabla de Contenidos de Tablas

### Core / Auth
- `tenants` — Empresas mineras clientes
- `users` — Usuarios del sistema
- `user_roles` — Roles por tenant
- `audit_logs` — Registro inmutable de cambios

### Gestión de Categorías
- `categories` — Familias de materiales/servicios
- `materials` — Maestro de materiales
- `framework_agreements` — Acuerdos marco
- `agreement_items` — Ítems de un acuerdo marco
- `price_benchmarks` — Benchmarking vs. índices LME/CRU

### Proveedores y Homologación
- `suppliers` — Maestro de proveedores
- `supplier_qualifications` — Homologación por criterio
- `supplier_documents` — Documentos de homologación
- `supplier_scorecards` — Evaluación periódica de desempeño

### Sourcing y Licitaciones
- `tenders` — Licitaciones / RFQ / RFP
- `tender_items` — Ítems de una licitación
- `tender_bids` — Cotizaciones de proveedores
- `tender_evaluations` — Evaluación técnico-económica

### Compras Operativas
- `purchase_requests` — Solicitudes de compra (PR)
- `purchase_orders` — Órdenes de compra (OC)
- `po_items` — Ítems de una OC
- `blanket_orders` — Órdenes marco recurrentes
- `receipts` — Recepciones en almacén
- `invoices` — Facturas (para 3-way match)

### Inventario MRO
- `inventory_items` — Ítems en inventario
- `inventory_movements` — Entradas/salidas
- `reorder_points` — Puntos de reorden calculados

### Analytics
- `spend_snapshots` — Snapshot mensual del gasto (para reportes históricos)
- `kpi_daily` — KPIs calculados diariamente (particionado por mes)

---

## Definiciones de Tablas

### tenants
```sql
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruc             VARCHAR(11) NOT NULL UNIQUE,
    business_name   VARCHAR(255) NOT NULL,
    trade_name      VARCHAR(255),
    plan            VARCHAR(50) NOT NULL DEFAULT 'standard',
                    -- standard | professional | enterprise
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
                    -- active | suspended | churned
    mining_units    JSONB,           -- unidades mineras con coordenadas
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### users
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    azure_ad_id     VARCHAR(255) UNIQUE,  -- ID de Azure AD B2C
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL,
                    -- superadmin | client_admin | buyer | approver | viewer | supplier
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX ON users (tenant_id);
CREATE INDEX ON users (azure_ad_id);
```

### framework_agreements (Acuerdos Marco)
```sql
CREATE TABLE framework_agreements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    agreement_number VARCHAR(50) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    category_id     UUID NOT NULL REFERENCES categories(id),
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
                    -- draft | active | expiring | expired | terminated
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    total_value     NUMERIC(15,2),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    -- Cláusulas de reajuste (PPI, tipo de cambio)
    adjustment_clause JSONB,
    -- Términos y condiciones
    payment_terms   INTEGER NOT NULL DEFAULT 30, -- días
    delivery_terms  VARCHAR(100),                -- INCOTERM
    auto_renew      BOOLEAN NOT NULL DEFAULT FALSE,
    renewal_notice_days INTEGER DEFAULT 60,
    notes           TEXT,
    document_url    VARCHAR(500),  -- Azure Blob URL
    created_by      UUID REFERENCES users(id),
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(tenant_id, agreement_number)
);

CREATE INDEX ON framework_agreements (tenant_id);
CREATE INDEX ON framework_agreements (tenant_id, status);
CREATE INDEX ON framework_agreements (tenant_id, end_date)
    WHERE status IN ('active', 'expiring');
```

### suppliers (Maestro de Proveedores)
```sql
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    ruc             VARCHAR(11) NOT NULL,
    business_name   VARCHAR(255) NOT NULL,
    trade_name      VARCHAR(255),
    -- Calificación SUNAT
    sunat_status    VARCHAR(50),   -- activo | baja | suspension
    sunat_condition VARCHAR(50),   -- habido | no habido
    sunat_checked_at TIMESTAMPTZ,
    -- Homologación
    qualification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    -- pending | qualified | conditional | rejected | suspended
    qualification_score NUMERIC(5,2), -- 0-100
    qualification_date  DATE,
    -- Categorías en las que puede ofertar
    category_ids    UUID[] NOT NULL DEFAULT '{}',
    -- Datos de contacto
    contact_name    VARCHAR(255),
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(50),
    website         VARCHAR(255),
    address         TEXT,
    district        VARCHAR(100),
    province        VARCHAR(100),
    region          VARCHAR(100),
    -- Para proveedor local (zona de influencia)
    is_local        BOOLEAN NOT NULL DEFAULT FALSE,
    mining_zone     VARCHAR(100),
    -- Datos financieros (encriptados)
    credit_limit    NUMERIC(15,2),
    payment_terms   INTEGER DEFAULT 30,
    bank_account    TEXT,          -- encriptado con Azure TDE + column encryption
    -- Performance
    otif_rate       NUMERIC(5,2),  -- % On Time In Full histórico
    quality_score   NUMERIC(5,2),  -- 0-100
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(tenant_id, ruc)
);

CREATE INDEX ON suppliers (tenant_id);
CREATE INDEX ON suppliers (tenant_id, qualification_status);
CREATE INDEX ON suppliers (ruc);  -- Para búsqueda cross-tenant (superadmin)
```

### purchase_orders (Órdenes de Compra)
```sql
CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    po_number       VARCHAR(50) NOT NULL,
    po_type         VARCHAR(50) NOT NULL DEFAULT 'standard',
                    -- standard | blanket | emergency | import_oem
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
                    -- draft | pending_approval | approved | sent | partial | complete | cancelled
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    agreement_id    UUID REFERENCES framework_agreements(id),
    tender_id       UUID REFERENCES tenders(id),
    -- Importes
    subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate   NUMERIC(10,4) DEFAULT 1,
    -- Tiempos
    requested_date  DATE NOT NULL,
    required_date   DATE NOT NULL,
    delivery_date   DATE,          -- fecha real de entrega
    -- Logística
    delivery_address TEXT,
    mining_unit     VARCHAR(100),  -- unidad minera destino
    incoterm        VARCHAR(10),   -- para importaciones OEM
    -- Aprobación (workflow por monto)
    approval_level  INTEGER DEFAULT 1,  -- 1=buyer, 2=client_admin, 3=gerencia
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    -- Importación OEM
    customs_agent   VARCHAR(255),
    import_ref      VARCHAR(100),
    eta_port        DATE,
    eta_mine        DATE,
    -- Métricas
    lead_time_days  INTEGER,       -- días entre PO y entrega
    is_emergency    BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_reason TEXT,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(tenant_id, po_number)
);

-- Particionamiento por mes para performance
CREATE TABLE purchase_orders_2025_01 PARTITION OF purchase_orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- (Las particiones futuras se crean automáticamente con pg_partman)

CREATE INDEX ON purchase_orders (tenant_id, status);
CREATE INDEX ON purchase_orders (tenant_id, supplier_id);
CREATE INDEX ON purchase_orders (tenant_id, created_at DESC);
CREATE INDEX ON purchase_orders (tenant_id, is_emergency) WHERE is_emergency;
```

### audit_logs (Inmutable — NO actualizar nunca)
```sql
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,  -- NO UUID para performance de inserción
    tenant_id       UUID NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
                    -- order.created | order.approved | supplier.qualified | etc.
    entity_type     VARCHAR(100) NOT NULL,  -- purchase_orders | suppliers | etc.
    entity_id       UUID NOT NULL,
    actor_id        UUID,                   -- user que realizó la acción
    actor_email     VARCHAR(255),           -- desnormalizado para histórico
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- SIN updated_at, is_deleted — este registro es INMUTABLE
);

-- Particionamiento por mes (los audit logs crecen rápido)
-- Retención: 5 años mínimo (requisito regulatorio peruano)

CREATE INDEX ON audit_logs (tenant_id, entity_type, entity_id);
CREATE INDEX ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX ON audit_logs (actor_id, created_at DESC);
```

### kpi_daily (KPIs diarios — particionado)
```sql
CREATE TABLE kpi_daily (
    id              UUID DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    kpi_date        DATE NOT NULL,
    -- Ahorro
    savings_amount          NUMERIC(15,2) DEFAULT 0,
    savings_pct             NUMERIC(5,2) DEFAULT 0,
    -- Cobertura de acuerdos marco
    orders_under_agreement  INTEGER DEFAULT 0,
    orders_spot             INTEGER DEFAULT 0,
    pct_under_agreement     NUMERIC(5,2) DEFAULT 0,
    -- Lead times
    avg_lead_time_days      NUMERIC(7,2),
    -- OTIF
    otif_rate               NUMERIC(5,2),
    -- Contratos
    active_agreements       INTEGER DEFAULT 0,
    expiring_agreements     INTEGER DEFAULT 0,  -- próximos 30 días
    expired_agreements      INTEGER DEFAULT 0,
    -- Proveedores
    qualified_suppliers     INTEGER DEFAULT 0,
    pending_suppliers       INTEGER DEFAULT 0,
    -- Spend total
    total_spend             NUMERIC(15,2) DEFAULT 0,
    emergency_spend         NUMERIC(15,2) DEFAULT 0,
    pct_emergency_spend     NUMERIC(5,2) DEFAULT 0,
    PRIMARY KEY (tenant_id, kpi_date)
) PARTITION BY RANGE (kpi_date);
```

---

## Migraciones con Alembic

### Comandos frecuentes
```bash
# Crear nueva migración
alembic revision --autogenerate -m "add_supplier_otif_rate"

# Aplicar todas las migraciones pendientes
alembic upgrade head

# Ver estado actual
alembic current

# Rollback 1 versión
alembic downgrade -1

# Rollback a versión específica
alembic downgrade abc123def456
```

### Regla de migraciones
1. **NUNCA** modificar una migración ya aplicada en producción
2. Cada migración debe tener `upgrade()` Y `downgrade()` completos
3. Datos seed van en migraciones separadas, marcadas con `# DATA MIGRATION`
4. Antes de cualquier migración en producción: `pg_dump` de backup

---

## Queries de referencia frecuentes

### Spend analysis por categoría (último trimestre)
```sql
SELECT
    c.name AS category,
    SUM(po.total_amount) AS total_spend,
    COUNT(DISTINCT po.supplier_id) AS supplier_count,
    COUNT(po.id) AS order_count,
    SUM(po.total_amount) FILTER (WHERE po.agreement_id IS NOT NULL)
        / NULLIF(SUM(po.total_amount), 0) * 100 AS pct_under_agreement
FROM purchase_orders po
JOIN categories c ON po.category_id = c.id
WHERE po.tenant_id = current_setting('app.current_tenant')::uuid
  AND po.created_at >= NOW() - INTERVAL '3 months'
  AND NOT po.is_deleted
GROUP BY c.id, c.name
ORDER BY total_spend DESC;
```

### Contratos por vencer en X días
```sql
SELECT *
FROM framework_agreements
WHERE tenant_id = current_setting('app.current_tenant')::uuid
  AND status = 'active'
  AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
  AND NOT is_deleted
ORDER BY end_date ASC;
```

### Clasificación Pareto de proveedores por spend
```sql
WITH supplier_spend AS (
    SELECT
        s.id,
        s.business_name,
        SUM(po.total_amount) AS total_spend,
        SUM(SUM(po.total_amount)) OVER () AS grand_total
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.tenant_id = current_setting('app.current_tenant')::uuid
      AND po.created_at >= NOW() - INTERVAL '12 months'
    GROUP BY s.id, s.business_name
)
SELECT
    *,
    total_spend / grand_total * 100 AS pct_of_total,
    SUM(total_spend / grand_total * 100) OVER (ORDER BY total_spend DESC) AS cumulative_pct
FROM supplier_spend
ORDER BY total_spend DESC;
```

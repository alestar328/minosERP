-- ══════════════════════════════════════════════════════════════════════════════
--  Materiales — campos de maestro editable (carga manual / Excel)
-- ══════════════════════════════════════════════════════════════════════════════
--  La tabla `materiales` nació autoalimentada desde las OCs (último proveedor /
--  fecha / precio por `codigo`). Para poder MANTENER el catálogo a mano —crearlo
--  en el ERP o cargarlo por Excel— se añaden tres campos descriptivos que el
--  trigger de auto-alimentación no rellena (quedan a cargo del usuario):
--    · unidad      — unidad de medida del material (UN, KG, M, L, …)
--    · fabricante  — marca / fabricante (OEM)
--    · modelo      — código de parte / modelo del fabricante
--  Son nullable: las filas creadas por el historial de OCs simplemente los dejan
--  vacíos; la carga manual y el Excel los completan.
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.materiales add column if not exists unidad     text;
alter table public.materiales add column if not exists fabricante text;
alter table public.materiales add column if not exists modelo     text;

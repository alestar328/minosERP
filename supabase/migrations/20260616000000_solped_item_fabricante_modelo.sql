-- ══════════════════════════════════════════════════════════════════════════════
--  Solped items: N° SOLPED por ítem + tokenización fabricante/modelo
-- ══════════════════════════════════════════════════════════════════════════════
--  numero_solped: cada fila del Excel puede traer su PROPIO N° de SOLPED. Antes solo
--    guardábamos el número del documento (cabecera) y la UI lo replicaba en todas
--    las filas. Ahora se persiste por ítem y la cabecera sigue siendo el más frecuente.
--  texto_pedido: texto crudo de la columna "Texto Pedido de Compra en Material".
--  fabricante / modelo: tokenizados de `texto_pedido` (FABRICANTE / NUMERO DE PARTE).
--    Más adelante, con catálogo de proveedores, se resolverán automáticamente.
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.solped_items
  add column if not exists numero_solped text,
  add column if not exists texto_pedido  text,
  add column if not exists fabricante    text,
  add column if not exists modelo        text;

comment on column public.solped_items.numero_solped is 'N° de SOLPED de la fila (puede diferir del número del documento de cabecera).';
comment on column public.solped_items.texto_pedido  is 'Texto crudo de la columna "Texto Pedido de Compra en Material".';
comment on column public.solped_items.fabricante    is 'Fabricante/marca tokenizado de texto_pedido.';
comment on column public.solped_items.modelo         is 'Modelo / N° de parte tokenizado de texto_pedido.';

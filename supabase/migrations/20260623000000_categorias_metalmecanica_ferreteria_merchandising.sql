-- ══════════════════════════════════════════════════════════════════════════════
--  Nuevas categorías SOLPED: Metalmecánica, Ferretería, Merchandising
-- ══════════════════════════════════════════════════════════════════════════════
--  Observaciones 22/06: al reimportar el Excel corregido, el ERP solo aplica las
--  categorías que tiene grabadas. Se agregan estas tres (espejo de CATEGORIAS_SOLPED
--  en src/Solped.jsx). "Otros" se mantiene como catch-all final (orden 12).
-- ══════════════════════════════════════════════════════════════════════════════

update public.categorias set orden = 12 where nombre = 'Otros';

insert into public.categorias (nombre, color_bg, color_fg, orden) values
  ('Metalmecánica', '#6E8CA0', '#1B3A4B', 9),
  ('Ferretería',    '#C8A45C', '#5A3D0E', 10),
  ('Merchandising', '#E08AC0', '#6E1B52', 11)
on conflict (nombre) do nothing;

insert into public.categoria_reglas (categoria_id, campo, tipo, valores, orden)
select c.id, v.campo::regla_campo, v.tipo::regla_tipo, v.valores, v.orden
from (values
  ('Metalmecánica', 'textoBreve', 'contains', array['PERNO','TUERCA','ARANDELA','TORNILLO','PLANCHA','PLATINA','ANGULO','ÁNGULO','VIGA','BARRA','EJE','BOCINA','ELECTRODO','SOLDADURA','MAESTRANZA','MECANIZADO','ESPARRAGO','ESPÁRRAGO'], 1),
  ('Ferretería',    'textoBreve', 'contains', array['FERRETERIA','FERRETERÍA','CLAVO','ALAMBRE','CANDADO','BISAGRA','SILICONA','PEGAMENTO','LIJA','BROCA','DISCO DE CORTE','CINTA AISLANTE','WAIPE','ESCOBA','CADENA','GRILLETE','TEFLON','TEFLÓN'], 1),
  ('Merchandising', 'textoBreve', 'contains', array['MERCHANDISING','POLO','GORRA','LLAVERO','TOMATODO','LAPICERO','AGENDA','SOUVENIR','BANNER','GIGANTOGRAFIA','GIGANTOGRAFÍA','STICKER','TAZA','MUG'], 1)
) as v(categoria, campo, tipo, valores, orden)
join public.categorias c on c.nombre = v.categoria
where not exists (
  select 1 from public.categoria_reglas r where r.categoria_id = c.id
);

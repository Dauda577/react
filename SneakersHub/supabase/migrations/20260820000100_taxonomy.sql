-- 3-level taxonomy for listings: category (main), subcategory (sub), subcategory2 (mini)
-- Run against the SneakersHub project.

alter table public.listings add column if not exists subcategory text;
alter table public.listings add column if not exists subcategory2 text;

-- Backfill existing listings into the new tree (old flat label -> new path)
update public.listings l
set
  category    = m.category,
  subcategory = m.subcategory,
  subcategory2 = m.subcategory2
from (values
  ('Sneakers',    'Fashion',               'Footwear',                 'Sneakers & Trainers'),
  ('Phones',      'Phones & Tablets',      'Mobile Phones',            NULL),
  ('Clothes',     'Fashion',               NULL,                       NULL),
  ('Tops',        'Fashion',               'Women''s Clothing',        'Tops & Tees'),
  ('Bottoms',     'Fashion',               'Women''s Clothing',        'Jeans & Bottoms'),
  ('Outerwear',   'Fashion',               'Women''s Clothing',        'Outerwear & Jackets'),
  ('Activewear',  'Sports & Outdoors',     'Sports Clothing & Shoes',  'Activewear & Gym Wear'),
  ('Electronics', 'Electronics',            NULL,                       NULL),
  ('Watches',     'Fashion',               'Jewellery & Watches',      'Watches'),
  ('Bags',        'Fashion',               'Bags & Luggage',           NULL),
  ('Accessories', 'Fashion',               'Accessories',              NULL),
  ('Jewellery',   'Fashion',               'Jewellery & Watches',      NULL),
  ('Furniture',   'Home & Garden',         'Furniture',                NULL),
  ('Other',       'Other',                 NULL,                       NULL)
) as m(old_category, category, subcategory, subcategory2)
where l.category = m.old_category;

create index if not exists listings_taxonomy_idx
  on public.listings (category, subcategory, subcategory2);

-- Sanity check (should report ~1 row per unique old category, zero NULL category):
-- select category, subcategory, subcategory2, count(*) from public.listings group by 1,2,3 order by count(*) desc;
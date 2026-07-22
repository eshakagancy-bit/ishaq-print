-- Category-only migration for the ten verified EcoTank products.

begin;

do $$
begin
  if (select count(*) from public.products) <> 22 then
    raise exception 'Expected exactly 22 products before the EcoTank migration';
  end if;

  if (select count(*) from public.products where category = 'workforce') <> 12 then
    raise exception 'Expected exactly 12 existing WorkForce products';
  end if;

  if exists (
    select expected.name
    from (values
      ('Epson EcoTank L8180'),
      ('Epson EcoTank L8050'),
      ('Epson EcoTank L18050'),
      ('Epson EcoTank L6490'),
      ('Epson EcoTank L6270'),
      ('Epson EcoTank L4260'),
      ('Epson EcoTank L11050'),
      ('Epson EcoTank L3250'),
      ('Epson EcoTank L3210'),
      ('Epson EcoTank L15150')
    ) as expected(name)
    left join public.products as product on product.name = expected.name
    group by expected.name
    having count(product.id) <> 1
  ) then
    raise exception 'Every approved EcoTank name must match exactly one product';
  end if;

  if exists (
    select 1
    from public.products
    where name in (
      'Epson EcoTank L8180', 'Epson EcoTank L8050', 'Epson EcoTank L18050',
      'Epson EcoTank L6490', 'Epson EcoTank L6270', 'Epson EcoTank L4260',
      'Epson EcoTank L11050', 'Epson EcoTank L3250', 'Epson EcoTank L3210',
      'Epson EcoTank L15150'
    )
      and category <> 'printers'
  ) then
    raise exception 'An approved EcoTank product is not currently unclassified';
  end if;
end
$$;

with approved(name, target_category) as (
  values
    ('Epson EcoTank L8180', 'ecotank-6-color'),
    ('Epson EcoTank L8050', 'ecotank-6-color'),
    ('Epson EcoTank L18050', 'ecotank-6-color'),
    ('Epson EcoTank L6490', 'ecotank'),
    ('Epson EcoTank L6270', 'ecotank'),
    ('Epson EcoTank L4260', 'ecotank'),
    ('Epson EcoTank L11050', 'ecotank'),
    ('Epson EcoTank L3250', 'ecotank'),
    ('Epson EcoTank L3210', 'ecotank'),
    ('Epson EcoTank L15150', 'ecotank')
)
update public.products as product
set category = approved.target_category
from approved
where product.name = approved.name
  and product.category = 'printers';

do $$
begin
  if (select count(*) from public.products) <> 22
    or (select count(*) from public.products where category = 'workforce') <> 12
    or (select count(*) from public.products where category = 'ecotank') <> 7
    or (select count(*) from public.products where category = 'ecotank-6-color') <> 3
    or (select count(*) from public.products where category = 'lq') <> 0 then
    raise exception 'Final printer category counts do not match the approved totals';
  end if;
end
$$;

commit;

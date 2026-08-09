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
      ('EPSON EcoTank L8180'),
      ('EPSON EcoTank L8050'),
      ('EPSON EcoTank L18050'),
      ('EPSON EcoTank L6490'),
      ('EPSON EcoTank L6270'),
      ('EPSON EcoTank L4260'),
      ('EPSON EcoTank L11050'),
      ('EPSON EcoTank L3250'),
      ('EPSON EcoTank L3210'),
      ('EPSON EcoTank L15150')
    ) as expected(name)
    left join public.products as product on product.name = expected.name
    group by expected.name
    having count(product.id) <> 1
  ) then
    raise exception 'Every approved EcoTank name must match exactly one product';
  end if;

  if exists (
    select 1
    from (values
      ('EPSON EcoTank L8180', 'printers'),
      ('EPSON EcoTank L8050', 'printers'),
      ('EPSON EcoTank L18050', 'printers'),
      ('EPSON EcoTank L6490', 'printers'),
      ('EPSON EcoTank L6270', 'printers'),
      ('EPSON EcoTank L4260', 'printers'),
      ('EPSON EcoTank L11050', 'ecotank-6-color'),
      ('EPSON EcoTank L3250', 'printers'),
      ('EPSON EcoTank L3210', 'printers'),
      ('EPSON EcoTank L15150', 'printers')
    ) as expected(name, source_category)
    join public.products as product on product.name = expected.name
    where product.category <> expected.source_category
  ) then
    raise exception 'An approved EcoTank product has an unexpected source category';
  end if;
end
$$;

with approved(name, source_category, target_category) as (
  values
    ('EPSON EcoTank L8180', 'printers', 'ecotank-6-color'),
    ('EPSON EcoTank L8050', 'printers', 'ecotank-6-color'),
    ('EPSON EcoTank L18050', 'printers', 'ecotank-6-color'),
    ('EPSON EcoTank L6490', 'printers', 'ecotank'),
    ('EPSON EcoTank L6270', 'printers', 'ecotank'),
    ('EPSON EcoTank L4260', 'printers', 'ecotank'),
    ('EPSON EcoTank L11050', 'ecotank-6-color', 'ecotank'),
    ('EPSON EcoTank L3250', 'printers', 'ecotank'),
    ('EPSON EcoTank L3210', 'printers', 'ecotank'),
    ('EPSON EcoTank L15150', 'printers', 'ecotank')
)
update public.products as product
set category = approved.target_category
from approved
where product.name = approved.name
  and product.category = approved.source_category;

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

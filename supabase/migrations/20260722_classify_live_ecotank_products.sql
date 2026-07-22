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
    from public.products
    where name in (
      'EPSON EcoTank L8180', 'EPSON EcoTank L8050', 'EPSON EcoTank L18050',
      'EPSON EcoTank L6490', 'EPSON EcoTank L6270', 'EPSON EcoTank L4260',
      'EPSON EcoTank L11050', 'EPSON EcoTank L3250', 'EPSON EcoTank L3210',
      'EPSON EcoTank L15150'
    )
      and category <> 'printers'
  ) then
    raise exception 'An approved EcoTank product is not currently unclassified';
  end if;
end
$$;

with approved(name, target_category) as (
  values
    ('EPSON EcoTank L8180', 'ecotank-6-color'),
    ('EPSON EcoTank L8050', 'ecotank-6-color'),
    ('EPSON EcoTank L18050', 'ecotank-6-color'),
    ('EPSON EcoTank L6490', 'ecotank'),
    ('EPSON EcoTank L6270', 'ecotank'),
    ('EPSON EcoTank L4260', 'ecotank'),
    ('EPSON EcoTank L11050', 'ecotank'),
    ('EPSON EcoTank L3250', 'ecotank'),
    ('EPSON EcoTank L3210', 'ecotank'),
    ('EPSON EcoTank L15150', 'ecotank')
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

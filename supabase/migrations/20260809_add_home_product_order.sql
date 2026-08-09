-- Adds a homepage-only product order without changing the existing catalog order.

begin;

alter table public.products
  add column if not exists home_display_order integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_home_display_order_nonnegative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_home_display_order_nonnegative
      check (home_display_order is null or home_display_order >= 0);
  end if;
end
$$;

with ranked_products as (
  select
    id,
    row_number() over (
      partition by case
        when category in ('printers', 'workforce', 'ecotank', 'ecotank-6-color', 'lq') then 'printers'
        else category
      end
      order by sort_order, id
    ) - 1 as home_display_order
  from public.products
  where category in ('printers', 'workforce', 'ecotank', 'ecotank-6-color', 'lq', 'papers', 'inks')
)
update public.products as product
set home_display_order = ranked.home_display_order::integer
from ranked_products as ranked
where product.id = ranked.id
  and product.home_display_order is null;

create index if not exists products_home_display_order_idx
  on public.products (home_display_order asc nulls last, sort_order, id);

create or replace function public.set_home_product_order(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_count integer;
  updated_count integer;
begin
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'home product order must be a JSON array';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      id bigint,
      category text,
      home_display_order integer
    )
    where item.id is null
      or item.category not in ('printers', 'papers', 'inks')
      or item.home_display_order is null
      or item.home_display_order < 0
  ) then
    raise exception 'invalid home product order item';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      id bigint,
      category text,
      home_display_order integer
    )
    group by item.id
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      id bigint,
      category text,
      home_display_order integer
    )
    group by item.category, item.home_display_order
    having count(*) > 1
  ) then
    raise exception 'duplicate home product order item';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      id bigint,
      category text,
      home_display_order integer
    )
    group by item.category
    having min(item.home_display_order) <> 0
      or max(item.home_display_order) <> count(*) - 1
  ) then
    raise exception 'home product order must be contiguous in every category';
  end if;

  select count(*)
  into expected_count
  from public.products
  where category in ('printers', 'workforce', 'ecotank', 'ecotank-6-color', 'lq', 'papers', 'inks');

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) <> expected_count then
    raise exception 'home product order must include every public product';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      id bigint,
      category text,
      home_display_order integer
    )
    left join public.products as product on product.id = item.id
    where product.id is null
      or case
        when product.category in ('printers', 'workforce', 'ecotank', 'ecotank-6-color', 'lq') then 'printers'
        else product.category
      end <> item.category
  ) then
    raise exception 'home product order contains a missing product or category mismatch';
  end if;

  update public.products as product
  set home_display_order = item.home_display_order,
      updated_at = now()
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
    id bigint,
    category text,
    home_display_order integer
  )
  where product.id = item.id;

  get diagnostics updated_count = row_count;
  if updated_count <> expected_count then
    raise exception 'home product order update was incomplete';
  end if;
end;
$$;

revoke all on function public.set_home_product_order(jsonb) from public, anon, authenticated;
grant execute on function public.set_home_product_order(jsonb) to service_role;

commit;

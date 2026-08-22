-- Adds one optional, manually managed reference number to the unified product table.
-- Existing products remain unchanged with NULL references. Uniqueness is global and
-- case-insensitive across printers, inks, papers, and every other product category.

begin;

alter table public.products
  add column if not exists reference_number text;

do $$
begin
  if exists (
    select lower(btrim(reference_number))
    from public.products
    where reference_number is not null
    group by lower(btrim(reference_number))
    having count(*) > 1
  ) then
    raise exception 'duplicate product reference numbers must be resolved before migration';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_reference_number_valid'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_reference_number_valid check (
        reference_number is null or (
          reference_number = btrim(reference_number)
          and char_length(reference_number) between 1 and 50
        )
      );
  end if;
end
$$;

create unique index if not exists products_reference_number_ci_uidx
  on public.products (lower(reference_number))
  where reference_number is not null;

create or replace function public.replace_site_data(
  p_settings jsonb,
  p_products jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_settings (id, payload, updated_at)
  values (1, coalesce(p_settings, '{}'::jsonb), now())
  on conflict (id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  delete from public.products where id is not null;

  insert into public.products (
    id, reference_number, name, family, image, category, type, size, badge, price,
    description, features, specifications, specifications_source_url,
    specifications_verified_at, printer_page_content, sort_order,
    home_display_order, created_at, updated_at
  )
  select
    item.id,
    nullif(btrim(item.reference_number), ''),
    item.name,
    coalesce(item.family, ''),
    item.image,
    item.category,
    coalesce(item.type, ''),
    coalesce(item.size, ''),
    nullif(item.badge, ''),
    nullif(item.price, ''),
    coalesce(item.description, ''),
    coalesce(item.features, '[]'::jsonb),
    item.specifications,
    nullif(item.specifications_source_url, ''),
    item.specifications_verified_at,
    item.printer_page_content,
    coalesce(item.sort_order, 0),
    item.home_display_order,
    now(),
    now()
  from jsonb_to_recordset(coalesce(p_products, '[]'::jsonb)) as item(
    id bigint,
    reference_number text,
    name text,
    family text,
    image text,
    category text,
    type text,
    size text,
    badge text,
    price text,
    description text,
    features jsonb,
    specifications jsonb,
    specifications_source_url text,
    specifications_verified_at timestamptz,
    printer_page_content jsonb,
    sort_order integer,
    home_display_order integer
  );
end;
$$;

revoke all on function public.replace_site_data(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_site_data(jsonb, jsonb) to service_role;

commit;

-- Adds optional long-form printer page content without changing existing product data.

begin;

alter table public.products
  add column if not exists printer_page_content jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_printer_page_content_is_object'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_printer_page_content_is_object
      check (printer_page_content is null or jsonb_typeof(printer_page_content) = 'object')
      not valid;
  end if;
end
$$;

alter table public.products
  validate constraint products_printer_page_content_is_object;

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
    id, name, family, image, category, type, size, badge, price,
    description, features, specifications, specifications_source_url,
    specifications_verified_at, printer_page_content, sort_order, created_at, updated_at
  )
  select
    item.id,
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
    now(),
    now()
  from jsonb_to_recordset(coalesce(p_products, '[]'::jsonb)) as item(
    id bigint,
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
    sort_order integer
  );
end;
$$;

revoke all on function public.replace_site_data(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_site_data(jsonb, jsonb) to service_role;

commit;

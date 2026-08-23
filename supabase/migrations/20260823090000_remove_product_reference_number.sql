-- Removes the unused product reference-number feature after verifying that no
-- stored product values would be lost. The previous migration remains intact as
-- immutable deployment history.

begin;

do $$
begin
  if exists (
    select 1
    from public.products
    where reference_number is not null
  ) then
    raise exception 'cannot remove product reference numbers while values still exist';
  end if;
end
$$;

drop index if exists public.products_reference_number_ci_uidx;

alter table public.products
  drop constraint if exists products_reference_number_valid;

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
    specifications_verified_at, printer_page_content, sort_order,
    home_display_order, created_at, updated_at
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
    item.home_display_order,
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
    sort_order integer,
    home_display_order integer
  );
end;
$$;

revoke all on function public.replace_site_data(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_site_data(jsonb, jsonb) to service_role;

alter table public.products
  drop column if exists reference_number;

commit;

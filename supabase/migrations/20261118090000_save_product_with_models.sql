-- Save one product and its full model/variant list in the caller's transaction.
begin;

create or replace function public.save_product_with_models(
  p_product jsonb, p_models jsonb, p_create boolean
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  incoming public.products%rowtype;
  saved public.products%rowtype;
  printer_categories constant text[] := array['printers', 'workforce', 'ecotank', 'ecotank-6-color', 'lq'];
  order_categories text[];
begin
  if jsonb_typeof(p_product) is distinct from 'object'
    or jsonb_typeof(p_models) is distinct from 'array' or p_create is null then
    raise exception 'Invalid product save payload' using errcode = '22023';
  end if;
  incoming := jsonb_populate_record(null::public.products, p_product);
  if incoming.id is null or incoming.id <= 0 or nullif(btrim(incoming.name), '') is null
    or incoming.category is null or incoming.sort_order is null or incoming.sort_order < 0
    or jsonb_array_length(p_models) > 100 then
    raise exception 'Invalid product save payload' using errcode = '22023';
  end if;
  if exists (
    select from jsonb_array_elements(p_models) as m(value)
    where jsonb_typeof(m.value) <> 'object'
      or case jsonb_typeof(coalesce(m.value->'variants', '[]'::jsonb))
        when 'array' then jsonb_array_length(coalesce(m.value->'variants', '[]'::jsonb)) > 20
        else true end
  ) then
    raise exception 'Invalid product model list' using errcode = '22023';
  end if;

  if p_create then
    if incoming.home_display_order is null then
      order_categories := case
        when incoming.category = any(printer_categories) then printer_categories
        when incoming.category = 'laser_inks' then array['inks', 'laser_inks']
        when incoming.category in ('papers', 'inks') then array[incoming.category]
      end;
      if order_categories is not null then
        -- Serialize automatically ordered inserts. Ink and laser scopes overlap.
        perform pg_advisory_xact_lock(1267332321);
        select coalesce(max(coalesce(p.home_display_order, 0)), -1) + 1
          into incoming.home_display_order
          from public.products as p where p.category = any(order_categories);
      end if;
    end if;
    insert into public.products (
      id, name, family, image, category, type, size, badge, price, description, features,
      specifications, printer_page_content, specifications_source_url, specifications_verified_at,
      sort_order, home_display_order
    ) values (
      incoming.id, incoming.name, incoming.family, incoming.image, incoming.category,
      incoming.type, incoming.size, incoming.badge, incoming.price, incoming.description,
      incoming.features, incoming.specifications, incoming.printer_page_content,
      incoming.specifications_source_url, incoming.specifications_verified_at,
      incoming.sort_order, incoming.home_display_order
    ) returning * into saved;
  else
    -- The update locks this product until model synchronization and the response
    -- snapshot finish, so concurrent saves for the same ID cannot interleave.
    update public.products as p set
      name = incoming.name, family = incoming.family, image = incoming.image,
      category = incoming.category, type = incoming.type, size = incoming.size,
      badge = case when incoming.category = any(printer_categories) then p.badge else incoming.badge end,
      price = incoming.price, description = incoming.description, features = incoming.features,
      specifications = incoming.specifications, printer_page_content = incoming.printer_page_content,
      specifications_source_url = incoming.specifications_source_url,
      specifications_verified_at = incoming.specifications_verified_at,
      sort_order = incoming.sort_order, home_display_order = incoming.home_display_order,
      updated_at = clock_timestamp()
    where p.id = incoming.id
    returning p.* into saved;
    if not found then
      raise exception 'Product does not exist' using errcode = 'P0002';
    end if;
  end if;

  -- Let any failure escape so PostgreSQL rolls back the parent and all children.
  perform public.sync_product_models(saved.id, p_models);
  return to_jsonb(saved) || jsonb_build_object('product_models', coalesce((
    select jsonb_agg(to_jsonb(m) || jsonb_build_object('product_model_variants', coalesce((
      select jsonb_agg(to_jsonb(v) order by v.sort_order, v.id)
      from public.product_model_variants as v where v.product_model_id = m.id
    ), '[]'::jsonb)) order by m.sort_order, m.id)
    from public.product_models as m where m.product_id = saved.id
  ), '[]'::jsonb));
end;
$$;

revoke all on function public.save_product_with_models(jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_product_with_models(jsonb, jsonb, boolean) to service_role;

commit;

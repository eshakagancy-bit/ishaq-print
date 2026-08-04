begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table approved_ink_product_names (
  id bigint primary key,
  old_name text not null,
  new_name text not null,
  capacities text[] not null
) on commit drop;

insert into approved_ink_product_names (id, old_name, new_name, capacities)
values
  (1785436371873, 'UV', 'حبر UV 500 مل', array['500 مل']::text[]),
  (1785613292781, 'Dey-0005', 'حبر Dye 0005 1000 مل', array['1000 مل']::text[]),
  (1785614704244, 'Dye- Pigament', 'حبر Dye / Pigment 100 مل', array['100 مل']::text[]),
  (1785614784716, 'Dye-WFC20750', 'حبر Dye WF-C20750 1000 مل', array['1000 مل']::text[]),
  (1785614841661, 'ECO-Solvent', 'حبر Eco-Solvent 1000 مل', array['1000 مل']::text[]),
  (1785614888877, 'Pigament-0062', 'حبر Pigment 500 مل', array['500 مل']::text[]),
  (1785614968465, 'DTF-2065', 'حبر DTF 500 مل', array['500 مل']::text[]),
  (1785615020399, 'Dye-0935', 'حبر Dye 0935 500 مل', array['500 مل']::text[]),
  (1785615049745, 'DYE-8690', 'حبر Dye 8690 500 مل', array['500 مل']::text[]),
  (1785615129114, '092-Sublmation', 'حبر Sublimation 500 مل', array['500 مل']::text[]),
  (1785692107684, 'Dye  L3150-L3110', 'حبر Dye L3150 / L3110 70 مل', array['70 مل']::text[]),
  (1785693562090, 'Dey-Universal', 'حبر Dye Universal 100 مل', array['100 مل']::text[]),
  (1785695633529, 'Dye L8050', 'حبر Dye L8050 70 مل', array['70 مل']::text[]);

do $$
declare
  target_count integer;
  safe_count integer;
  updated_count integer;
  verified_count integer;
begin
  -- Lock only the approved rows, in a stable order, before validating or updating.
  perform product.id
  from public.products product
  join approved_ink_product_names approved on approved.id = product.id
  order by product.id
  for update of product;

  select count(*) into target_count
  from public.products product
  join approved_ink_product_names approved on approved.id = product.id;

  select count(*) into safe_count
  from public.products product
  join approved_ink_product_names approved on approved.id = product.id
  where product.category = 'inks'
    and product.name in (approved.old_name, approved.new_name);

  if target_count <> 13 or safe_count <> 13 then
    raise exception 'Unsafe ink migration state: targeted %, safe %, expected 13; no rows were updated', target_count, safe_count;
  end if;

  update public.products product
  set
    name = approved.new_name,
    specifications = jsonb_set(
      coalesce(product.specifications, '{}'::jsonb),
      '{capacities}',
      to_jsonb(approved.capacities),
      true
    ),
    updated_at = now()
  from approved_ink_product_names approved
  where product.id = approved.id
    and product.category = 'inks'
    and product.name in (approved.old_name, approved.new_name)
    and (
      product.name is distinct from approved.new_name
      or product.specifications -> 'capacities' is distinct from to_jsonb(approved.capacities)
    );

  get diagnostics updated_count = row_count;

  select count(*) into verified_count
  from public.products product
  join approved_ink_product_names approved on approved.id = product.id
  where product.category = 'inks'
    and product.name = approved.new_name
    and product.specifications -> 'capacities' = to_jsonb(approved.capacities);

  if verified_count <> 13 then
    raise exception 'Ink migration verification failed: verified %, expected 13; transaction will roll back', verified_count;
  end if;

  raise notice 'Ink migration targeted: %, modified: %, verified: %', target_count, updated_count, verified_count;
end $$;

commit;

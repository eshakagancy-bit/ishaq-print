-- Adds verified color-to-image metadata for the existing SQM 500ml UV ink.
-- Every image was visually checked against the printed code on its label.
-- The existing images array and every other product field remain unchanged.

begin;
set local lock_timeout = '3s';
set local statement_timeout = '10s';

update public.products
set specifications = jsonb_set(
  coalesce(specifications, '{}'::jsonb),
  '{variants}',
  jsonb_build_array(
    jsonb_build_object('code', 'BK', 'label', 'Black', 'image', '/api/media/products/1785951774811-1574f4c1-7a4a-4fd1-b0e7-1e2fcf460a1b.webp'),
    jsonb_build_object('code', 'C', 'label', 'Cyan', 'image', '/api/media/products/1785951776287-dcd515e9-48e8-4ef4-8b50-7644d3c47dad.webp'),
    jsonb_build_object('code', 'M', 'label', 'Magenta', 'image', '/api/media/products/1785951777897-754c4f13-76d5-4d82-8881-3078d372bcea.webp'),
    jsonb_build_object('code', 'V', 'label', 'Varnish', 'image', '/api/media/products/1785951779410-7643f239-9182-47fe-86e1-d55656745bcd.webp'),
    jsonb_build_object('code', 'W', 'label', 'White', 'image', '/api/media/products/1785951781081-21886a2d-f507-427c-8c1d-593bae299d3b.webp'),
    jsonb_build_object('code', 'Y', 'label', 'Yellow', 'image', '/api/media/products/1785951782751-299d7d66-3b83-4799-a24e-a6e00dc36a0e.webp')
  ),
  true
)
where id = 1785436371873
  and category = 'inks'
  and specifications->'images' = jsonb_build_array(
    '/api/media/products/1785951767030-10a62879-359e-45bc-b0d5-5943895df8e6.webp',
    '/api/media/products/1785951774811-1574f4c1-7a4a-4fd1-b0e7-1e2fcf460a1b.webp',
    '/api/media/products/1785951776287-dcd515e9-48e8-4ef4-8b50-7644d3c47dad.webp',
    '/api/media/products/1785951777897-754c4f13-76d5-4d82-8881-3078d372bcea.webp',
    '/api/media/products/1785951779410-7643f239-9182-47fe-86e1-d55656745bcd.webp',
    '/api/media/products/1785951781081-21886a2d-f507-427c-8c1d-593bae299d3b.webp',
    '/api/media/products/1785951782751-299d7d66-3b83-4799-a24e-a6e00dc36a0e.webp'
  );

do $$
begin
  if not exists (
    select 1 from public.products
    where id = 1785436371873
      and jsonb_array_length(coalesce(specifications->'variants', '[]'::jsonb)) = 6
  ) then
    raise exception 'verified UV ink variant mapping was not applied';
  end if;
end
$$;

commit;

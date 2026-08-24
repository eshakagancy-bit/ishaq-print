-- Adds visually verified color-to-image metadata for every existing ink product
-- that was still missing variants. The first image for each product is a group
-- gallery image; every image below is an independently verified bottle image
-- whose printed color code matches the explicit mapping.

begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

with verified(id, variants) as (
  values
    (1785613292781::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1785958609126-7ac414eb-f6ff-4bc1-9a32-4ddf8d2bb18a.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1785958610544-65dd176f-1530-48a0-9a2e-4243f7a7868c.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1785958612043-8c7ea46f-77e9-4eac-a578-e3a5ff733d8f.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1785958613421-40d65dc1-8fe2-4168-ab30-d68210ae3b26.webp'))),
    (1785614704244::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786208848602-1f7c6a5d-b9ab-44fe-a32f-e87a7d6ee47e.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786208851208-37548383-6926-4ee6-9206-e3de6721d927.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786208852998-8d94d614-e411-465a-8f3d-1cbbb26bd0af.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786208854183-b1e38a97-d1f5-4e82-b8dc-dc3c17cf1260.webp'))),
    (1785614784716::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786208902435-fb9fbd9c-2c82-4908-9e23-5095d7b8ff64.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786208903807-d4a79e07-139e-4e4f-b394-4973cbed44c3.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786208906765-f21ef65b-04b9-45eb-90f2-08961e78a72b.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786208909639-f89ae5cb-78b8-4974-bf5a-e17d82ae92fe.webp'))),
    (1785614841661::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786042938891-0b63c5b1-6f77-487f-bd9d-d00c2171a796.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786042946832-e236a91d-d9f9-49a9-b90f-e455d107f0c1.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786042962620-5019e9d4-7c7f-456b-bbe2-6868ee968ae6.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786042969208-9f7945d8-b8cd-4940-b510-6dfe025d6a40.webp'))),
    (1785614888877::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786042332183-e95853fa-1931-4f20-a97a-4e274abcf4d8.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786042338615-26377701-1ce2-4ee8-a75c-c3d15154d4ee.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786042340379-214e7c04-51cd-4b09-b628-ec5712fc7eac.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786042342133-3221df66-23f2-4c55-a52e-11ec444ccc8f.webp'))),
    (1785614968465::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786042411789-e6675816-6780-453a-82a8-c0169bdb6e72.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786042413511-59f11fc3-d240-4b92-a579-e02d1802472a.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786042415106-3491e022-27a5-4b33-827b-1270079eadcd.webp'),
      jsonb_build_object('code','W','label','White','image','/api/media/products/1786042416957-f89c3fae-3ec0-4366-b5ef-6107d7e6fa0a.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786042419224-87de67e1-5066-45dc-8e36-aef39a6cfe93.webp'))),
    (1785615020399::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786043141781-c4149faf-b655-4b30-a9cd-f10b5f0b61c1.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786043143460-763a8f15-fdd0-4d09-9845-dc642a74a385.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786043145198-554bca4f-9619-4d29-bcac-4457574ff78d.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786043147215-3e85a5e1-2853-4128-87af-ae12c8d851be.webp'))),
    (1785615049745::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786208670634-8517ff43-300d-421d-9868-c09cc7017534.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786208673236-ce30d8b1-5d86-4e3a-822f-bc792e665db4.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786208674812-1d93cd74-aa76-4b9e-b79f-b5bcf0f4be8a.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786208676452-8c2d078f-076b-4ec0-a56c-ee3d6a4421a1.webp'))),
    (1785615129114::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786208713822-de5debce-c117-4182-b8ab-393d4d1f73c9.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786208716690-86fc9346-5109-4adf-93f5-0e9a7dec967b.webp'),
      jsonb_build_object('code','LC','label','Light Cyan','image','/api/media/products/1786208720015-955d8a50-0b77-4b29-8863-60f9e478d8bc.webp'),
      jsonb_build_object('code','LM','label','Light Magenta','image','/api/media/products/1786208721854-2dcc05bc-b23a-4af5-a049-68f07c6ca0fc.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786208723021-20ac8868-d13a-4b4a-a6a0-d662aed19590.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786208724324-f8eb83bc-2340-4072-a510-84b982c1caab.webp'))),
    (1785692107684::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786208949992-fff53fde-31eb-46f9-a6c8-70ec43a8e3c5.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786208951920-fea5a1bd-4d52-4cc8-8ac4-86fd901b78b8.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786208952992-518367f3-fefe-4699-909f-dcefc51f4225.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786208954222-572c9213-6ec6-4b31-9917-e27c3e38021b.webp'))),
    (1785693562090::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786209069120-1ccc54d9-e63d-43b2-aa62-1fd1c2aded48.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786209070682-287b7003-c338-43d0-96fc-73728bbbcdc7.webp'),
      jsonb_build_object('code','LC','label','Light Cyan','image','/api/media/products/1786209071978-57c3f256-a170-4388-9a11-ea393f326d71.webp'),
      jsonb_build_object('code','LM','label','Light Magenta','image','/api/media/products/1786209074488-f3fabbec-12d4-4389-8a6a-75e7eef641ef.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786209075639-ee962cfd-72b4-4688-baf9-944d963a0300.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786209077501-473016d3-c0fa-49d0-8a9d-260a80cf6d9d.webp'))),
    (1785695633529::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786209149378-ef54ec91-bfe6-475f-b6ee-ab7f72c8ebab.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786209150801-ca0b29cc-e2ea-4516-86bd-2eca3008c0ab.webp'),
      jsonb_build_object('code','LC','label','Light Cyan','image','/api/media/products/1786209151933-a8644ebb-4210-4fe6-ba7b-01d1b641a73a.webp'),
      jsonb_build_object('code','LM','label','Light Magenta','image','/api/media/products/1786209152913-62f3cb81-7f3c-4b60-a0ee-518bb390089a.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786209154076-3b4446b8-c68a-4297-a1d3-36e62fa84438.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786209155165-9d191cf5-8068-45f5-89a1-aa820df1baf2.webp'))),
    (1786283698362::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786283687488-d738c68b-d3d4-4816-91a7-8de7f78b2eea.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786283688938-017eb09b-a130-408b-8f53-3875dd0ea3b5.webp'),
      jsonb_build_object('code','LC','label','Light Cyan','image','/api/media/products/1786283690557-d9630971-b56c-41dc-a84f-7ac5a4d43f00.webp'),
      jsonb_build_object('code','LM','label','Light Magenta','image','/api/media/products/1786283691930-0f7f5a07-c6d8-4cf2-8998-9aa9097b5993.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786283693475-d0cd6cb7-0c70-410e-a5e2-eb33a0ca669b.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786283695325-4b17a2d8-86cf-4102-9b86-4b73512d8457.webp'))),
    (1786284107858::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786284085317-f5f8cdfb-363a-401d-a8f3-5c4643cebbd6.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786284086667-1016e707-428e-4365-9910-04f6c7095c36.webp'),
      jsonb_build_object('code','LC','label','Light Cyan','image','/api/media/products/1786284088259-1f45516a-538e-457d-ac8d-451521147d15.webp'),
      jsonb_build_object('code','LM','label','Light Magenta','image','/api/media/products/1786284089737-9344e4ac-7bec-4f3e-bb2f-cadec82e96a7.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786284091232-b7648e4a-02cb-4b00-be23-e7d83b37dc61.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786284092499-52e15375-0348-4b88-bc77-b14bb6c60f6f.webp'))),
    (1786284579967::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/1786284568021-ba050511-b1e9-4404-bc46-e4915b68df52.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/1786284569526-063610cb-bd72-4298-a3b6-284ee48652e1.webp'),
      jsonb_build_object('code','LC','label','Light Cyan','image','/api/media/products/1786284570851-6aa73ef6-9221-4951-9f59-e5175ecdc3f9.webp'),
      jsonb_build_object('code','LM','label','Light Magenta','image','/api/media/products/1786284572399-8bdcddca-4af7-48e1-b9e1-08e0b39601da.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/1786284573903-1b79b959-6914-40e3-b1d9-8f05b8065e5f.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/1786284575479-f32bf8de-e383-4a74-aa68-18979a0692c9.webp'))),
    (1786987310455::bigint, jsonb_build_array(
      jsonb_build_object('code','BK','label','Black','image','/api/media/products/ad8ec095-5ec7-4b42-aacb-064580659548.webp'),
      jsonb_build_object('code','C','label','Cyan','image','/api/media/products/09e43d6f-575f-46f1-904a-66e5df57d1cc.webp'),
      jsonb_build_object('code','M','label','Magenta','image','/api/media/products/893c8803-f981-402a-a3cc-4fd47d3fa4f8.webp'),
      jsonb_build_object('code','Y','label','Yellow','image','/api/media/products/7bbdabaf-f0d7-466c-8683-6a65d0fcaa9c.webp')))
), eligible as (
  select p.id, v.variants
  from public.products p
  join verified v using (id)
  where p.category = 'inks'
    and jsonb_array_length(coalesce(p.specifications->'variants', '[]'::jsonb)) = 0
    and jsonb_array_length(coalesce(p.specifications->'images', '[]'::jsonb)) = jsonb_array_length(v.variants) + 1
    and not exists (
      select 1
      from jsonb_array_elements(v.variants) variant
      where not (p.specifications->'images' ? (variant->>'image'))
    )
)
update public.products p
set specifications = jsonb_set(coalesce(p.specifications, '{}'::jsonb), '{variants}', e.variants, true)
from eligible e
where p.id = e.id;

do $$
declare
  target_ids bigint[] := array[
    1785613292781,1785614704244,1785614784716,1785614841661,
    1785614888877,1785614968465,1785615020399,1785615049745,
    1785615129114,1785692107684,1785693562090,1785695633529,
    1786283698362,1786284107858,1786284579967,1786987310455
  ];
  complete_count integer;
begin
  select count(*) into complete_count
  from public.products
  where id = any(target_ids)
    and category = 'inks'
    and jsonb_array_length(coalesce(specifications->'variants', '[]'::jsonb)) > 0
    and not exists (
      select 1 from jsonb_array_elements(specifications->'variants') variant
      where coalesce(variant->>'code','') = ''
         or coalesce(variant->>'label','') = ''
         or coalesce(variant->>'image','') = ''
         or not (specifications->'images' ? (variant->>'image'))
    );

  if complete_count <> 16 then
    raise exception 'verified ink variants applied to % of 16 target products', complete_count;
  end if;
end
$$;

commit;

-- Phase-one structured specifications for the three approved LQ/FX products only.
-- The two secondary Epson URLs below were used for verification but are not stored
-- because products.specifications_source_url holds one URL:
-- https://epson.com.hk/For-Work/Printers/Dot-Matrix-Printers/Epson-LQ-690/p/C11CA13081
-- https://files.support.epson.com/htmldocs/fx890_/fx890_rf/apspe_2.htm

begin;

create temporary table lq_phase_one_before on commit drop as
select
  id, name, family, image, category, type, size, badge, price,
  description, features, specifications, specifications_source_url,
  specifications_verified_at, sort_order
from public.products
where name in ('LQ-350', 'EPSON LQ-690', 'EPSON FX-890');

do $$
begin
  if exists (
    select expected.name
    from (values ('LQ-350'), ('EPSON LQ-690'), ('EPSON FX-890')) as expected(name)
    left join public.products as product on product.name = expected.name
    group by expected.name
    having count(product.id) <> 1
  ) then
    raise exception 'Every approved LQ/FX name must match exactly one product';
  end if;

  if exists (
    select 1
    from public.products
    where name in ('LQ-350', 'EPSON LQ-690', 'EPSON FX-890')
      and category <> 'lq'
  ) then
    raise exception 'Every approved LQ/FX product must remain in the lq category';
  end if;
end
$$;

do $$
declare
  affected_rows integer;
begin
  with approved(name, family, size, type, description, features, specifications, source_url) as (
    values
      (
        'LQ-350',
        'Epson LQ',
        'ورق متصل 80 عمود',
        'طابعة نقطية',
        'طابعة نقطية مدمجة وموثوقة لطباعة الفواتير والسندات والورق المتصل، مناسبة للمكاتب ونقاط العمل اليومية.',
        '["24 إبرة، 80 عموداً، سرعة 347 حرفاً/ثانية، أصل +3 نسخ، منافذ USB وتسلسلي ومتوازي."]'::jsonb,
        '{"paperSize":"ورق متصل 80 عمود","printerType":"طابعة نقطية","functions":["طباعة"],"printTechnology":"مصفوفة نقطية تصادمية، 24 إبرة","colorCount":1,"colorMode":"أحادي اللون","wifi":false,"ethernet":false,"usb":true,"parallel":true,"serial":true,"optionalInterface":false,"scanner":false,"fax":false,"duplex":false,"adf":false,"adfCapacity":null,"printSpeed":347,"speedUnit":"حرف/ثانية","inkType":"شريط طباعة","borderless":false,"mobilePrinting":false,"usage":["مكتبي","فواتير وسندات"],"dotMatrixPins":24,"printColumns":80,"multipartCopies":3,"ribbonYield":2500000}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/dot-matrix/lq-350-dot-matrix-printer/p/12058'
      ),
      (
        'EPSON LQ-690',
        'Epson LQ',
        'ورق متصل 106 أعمدة',
        'طابعة نقطية',
        'طابعة نقطية عريضة ومتينة للنماذج والفواتير متعددة النسخ، توفر طباعة سريعة بعرض 106 أعمدة.',
        '["24 إبرة، 106 أعمدة، سرعة تصل إلى 529 حرفاً/ثانية، أصل +6 نسخ، USB ومنفذ متوازي."]'::jsonb,
        '{"paperSize":"ورق متصل 106 أعمدة","printerType":"طابعة نقطية","functions":["طباعة"],"printTechnology":"مصفوفة نقطية تصادمية، 24 إبرة","colorCount":1,"colorMode":"أحادي اللون","wifi":false,"ethernet":false,"usb":true,"parallel":true,"serial":false,"optionalInterface":false,"scanner":false,"fax":false,"duplex":false,"adf":false,"adfCapacity":null,"printSpeed":529,"speedUnit":"حرف/ثانية","inkType":"شريط طباعة","borderless":false,"mobilePrinting":false,"usage":["فواتير وسندات","شركات ومؤسسات"],"dotMatrixPins":24,"printColumns":106,"multipartCopies":6,"ribbonYield":10000000}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/dot-matrix/epson-lq-690/p/3417'
      ),
      (
        'EPSON FX-890',
        'Epson FX',
        'ورق متصل 80 عمود',
        'طابعة نقطية',
        'طابعة نقطية سريعة للأعمال الشاقة، مصممة للفواتير والتقارير والنماذج متعددة النسخ في بيئات العمل المستمرة.',
        '["9 إبر، 80 عموداً، سرعة تصل إلى 680 حرفاً/ثانية، أصل +6 نسخ، USB ومنفذ متوازي."]'::jsonb,
        '{"paperSize":"ورق متصل 80 عمود","printerType":"طابعة نقطية","functions":["طباعة"],"printTechnology":"مصفوفة نقطية تصادمية، 9 إبر","colorCount":1,"colorMode":"أحادي اللون","wifi":false,"ethernet":false,"usb":true,"parallel":true,"serial":false,"optionalInterface":true,"scanner":false,"fax":false,"duplex":false,"adf":false,"adfCapacity":null,"printSpeed":680,"speedUnit":"حرف/ثانية","inkType":"شريط طباعة","borderless":false,"mobilePrinting":false,"usage":["فواتير وسندات","شركات ومؤسسات"],"dotMatrixPins":9,"printColumns":80,"multipartCopies":6,"ribbonYield":7500000}'::jsonb,
        'https://epson.com/For-Work/Printers/Impact-Dot-Matrix/FX-890-Impact-Printer/p/C11C524001'
      )
  )
  update public.products as product
  set
    family = approved.family,
    size = approved.size,
    type = approved.type,
    description = approved.description,
    features = approved.features,
    specifications = coalesce(product.specifications, '{}'::jsonb) || approved.specifications,
    specifications_source_url = approved.source_url,
    specifications_verified_at = current_timestamp
  from approved
  where product.name = approved.name
    and product.category = 'lq';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 3 then
    raise exception 'Expected to update exactly 3 LQ/FX products, updated %', affected_rows;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from public.products as product
    join lq_phase_one_before as old on old.id = product.id
    where product.name is distinct from old.name
      or product.image is distinct from old.image
      or product.category is distinct from old.category
      or product.price is distinct from old.price
      or product.badge is distinct from old.badge
      or product.sort_order is distinct from old.sort_order
  ) then
    raise exception 'A protected product field changed unexpectedly';
  end if;

  if (select count(*) from lq_phase_one_before) <> 3
    or (select count(*) from public.products where name in ('LQ-350', 'EPSON LQ-690', 'EPSON FX-890')) <> 3 then
    raise exception 'The three approved products were not preserved';
  end if;
end
$$;

commit;

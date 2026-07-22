-- Phase-two structured specifications for the ten approved EcoTank products only.

begin;

create temporary table ecotank_phase_two_before as
select * from public.products;

create temporary table ecotank_phase_two_fingerprints as
select
  md5(coalesce(string_agg(to_jsonb(product)::text, '|' order by product.id) filter (
    where product.name not in (
      'EPSON EcoTank L11050', 'EPSON EcoTank L15150', 'EPSON EcoTank L18050',
      'EPSON EcoTank L3210', 'EPSON EcoTank L3250', 'EPSON EcoTank L4260',
      'EPSON EcoTank L6270', 'EPSON EcoTank L6490', 'EPSON EcoTank L8050',
      'EPSON EcoTank L8180'
    )
  ), '')) as non_target_fingerprint,
  md5(coalesce(string_agg(jsonb_build_object(
    'id', product.id, 'name', product.name, 'image', product.image,
    'category', product.category, 'price', product.price, 'badge', product.badge,
    'sort_order', product.sort_order
  )::text, '|' order by product.id) filter (
    where product.name in (
      'EPSON EcoTank L11050', 'EPSON EcoTank L15150', 'EPSON EcoTank L18050',
      'EPSON EcoTank L3210', 'EPSON EcoTank L3250', 'EPSON EcoTank L4260',
      'EPSON EcoTank L6270', 'EPSON EcoTank L6490', 'EPSON EcoTank L8050',
      'EPSON EcoTank L8180'
    )
  ), '')) as protected_target_fingerprint
from public.products as product;

do $$
begin
  if (select count(*) from public.products) <> 25 then
    raise exception 'Expected exactly 25 products before the EcoTank phase-two migration';
  end if;

  if exists (
    select expected.name
    from (values
      ('EPSON EcoTank L11050', 'ecotank'),
      ('EPSON EcoTank L15150', 'ecotank'),
      ('EPSON EcoTank L18050', 'ecotank-6-color'),
      ('EPSON EcoTank L3210', 'ecotank'),
      ('EPSON EcoTank L3250', 'ecotank'),
      ('EPSON EcoTank L4260', 'ecotank'),
      ('EPSON EcoTank L6270', 'ecotank'),
      ('EPSON EcoTank L6490', 'ecotank'),
      ('EPSON EcoTank L8050', 'ecotank-6-color'),
      ('EPSON EcoTank L8180', 'ecotank-6-color')
    ) as expected(name, category)
    left join public.products as product on product.name = expected.name
    group by expected.name, expected.category
    having count(product.id) <> 1 or bool_or(product.category is distinct from expected.category)
  ) then
    raise exception 'Every approved EcoTank name must match exactly one product in its approved category';
  end if;
end
$$;

do $$
declare
  affected_rows integer;
begin
  with approved(name, category, family, size, type, description, features, specifications, source_url) as (
    values
      (
        'EPSON EcoTank L11050', 'ecotank', 'Epson EcoTank', 'A3+', 'طباعة فقط',
        'طابعة EcoTank اقتصادية بحجم A3+ للطباعة الملونة عالية الحجم، مع اتصال لاسلكي وتصميم مدمج للمكاتب.',
        '["طباعة فقط، A3+، Wi‑Fi وWi‑Fi Direct، 4 ألوان."]'::jsonb,
        '{"paperSize":"A3+","printerType":"طباعة فقط","functions":["طباعة"],"printTechnology":"PrecisionCore","colorCount":4,"wifi":true,"wifiDirect":true,"ethernet":false,"usb":true,"scanner":false,"fax":false,"adf":false,"duplexMode":null,"mobilePrinting":true,"cdDvdPrinting":false,"plasticCardPrinting":false,"usage":["مكاتب","طباعة A3+","أحجام طباعة مرتفعة"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l11050-a3-wi-fi-ink-tank-printer%2C-with-up-to-3-years-of-ink-included-/p/34299'
      ),
      (
        'EPSON EcoTank L15150', 'ecotank', 'Epson EcoTank', 'A3+', 'متعددة الوظائف',
        'طابعة EcoTank احترافية متعددة الوظائف بحجم A3+، تجمع الطباعة والنسخ والمسح والفاكس مع إنتاجية عالية واتصال شبكي متكامل.',
        '["A3+، طباعة ونسخ ومسح وفاكس، دوبلكس تلقائي، ADF بسعة 50 ورقة، Wi‑Fi وEthernet."]'::jsonb,
        '{"paperSize":"A3+","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"inkType":"DURABrite ET صبغي","wifi":true,"wifiDirect":true,"ethernet":true,"usb":true,"scanner":true,"fax":true,"adf":true,"adfCapacity":50,"duplexMode":"automatic","borderless":true,"mobilePrinting":true,"cdDvdPrinting":false,"plasticCardPrinting":false,"usage":["أعمال","مكاتب","مجموعات عمل"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l15150-a3%2B-multifunction-wi-fi-ink-tank-printer-with-fax/p/27709'
      ),
      (
        'EPSON EcoTank L18050', 'ecotank-6-color', 'Epson EcoTank Photo', 'A3+', 'طابعة صور',
        'طابعة صور EcoTank احترافية بحجم A3+ ونظام 6 ألوان، مصممة لإنتاج الصور والبطاقات والأقراص بجودة عالية وتكلفة منخفضة.',
        '["طباعة صور A3+، 6 ألوان، Wi‑Fi وWi‑Fi Direct، طباعة بلا حدود، تدعم CD/DVD وبطاقات PVC."]'::jsonb,
        '{"paperSize":"A3+","printerType":"طابعة صور","functions":["طباعة"],"printTechnology":"نفث حبر","colorCount":6,"inkType":"Dye","wifi":true,"wifiDirect":true,"ethernet":false,"usb":true,"scanner":false,"fax":false,"adf":false,"duplexMode":"manual","borderless":true,"mobilePrinting":true,"cdDvdPrinting":true,"plasticCardPrinting":true,"usage":["تصوير احترافي","صور A3+","أقراص","بطاقات"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l18050-a3%2B-wi-fi-ink-tank-photo-printer/p/34293'
      ),
      (
        'EPSON EcoTank L3210', 'ecotank', 'Epson EcoTank', 'A4', 'متعددة الوظائف',
        'طابعة EcoTank متعددة الوظائف اقتصادية للاستخدام المنزلي والمكتبي، توفر الطباعة والنسخ والمسح بخزانات حبر قابلة لإعادة التعبئة.',
        '["A4، طباعة ونسخ ومسح، USB، 4 ألوان، طباعة صور بلا حدود حتى 10×15 سم."]'::jsonb,
        '{"paperSize":"A4","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"نفث حبر","colorCount":4,"inkType":"Dye","wifi":false,"wifiDirect":false,"ethernet":false,"usb":true,"scanner":true,"fax":false,"adf":false,"duplexMode":"manual","borderless":true,"mobilePrinting":false,"cdDvdPrinting":false,"plasticCardPrinting":false,"usage":["منزلي","مكتبي شخصي"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l3210-multifunction-ink-tank-printer%2C-with-up-to-3-years-of-ink-included/p/30221'
      ),
      (
        'EPSON EcoTank L3250', 'ecotank', 'Epson EcoTank', 'A4', 'متعددة الوظائف',
        'طابعة EcoTank لاسلكية متعددة الوظائف للاستخدام المنزلي والمكتبي، تجمع الطباعة والنسخ والمسح مع تشغيل سهل من الهاتف.',
        '["A4، طباعة ونسخ ومسح، Wi‑Fi وWi‑Fi Direct، 4 ألوان، طباعة بلا حدود حتى 10×15 سم."]'::jsonb,
        '{"paperSize":"A4","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"نفث حبر","colorCount":4,"inkType":"Dye","wifi":true,"wifiDirect":true,"ethernet":false,"usb":true,"scanner":true,"fax":false,"adf":false,"duplexMode":"manual","borderless":true,"mobilePrinting":true,"cdDvdPrinting":false,"plasticCardPrinting":false,"usage":["منزلي","مكتبي شخصي"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l3250-multifunction-wi-fi-ink-tank-a4-printer%2C-with-up-to-3-years-of-ink-included/p/30226'
      ),
      (
        'EPSON EcoTank L4260', 'ecotank', 'Epson EcoTank', 'A4', 'متعددة الوظائف',
        'طابعة EcoTank لاسلكية متعددة الوظائف بحجم A4، توفر الطباعة والنسخ والمسح مع طباعة تلقائية على الوجهين.',
        '["A4، طباعة ونسخ ومسح، دوبلكس تلقائي، Wi‑Fi وWi‑Fi Direct، 4 ألوان."]'::jsonb,
        '{"paperSize":"A4","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"Micro Piezo","colorCount":4,"inkType":"أسود صبغي وألوان Dye","wifi":true,"wifiDirect":true,"ethernet":false,"usb":true,"scanner":true,"fax":false,"adf":false,"duplexMode":"automatic","borderless":true,"mobilePrinting":true,"cdDvdPrinting":false,"plasticCardPrinting":false,"usage":["منزلي","مكتبي شخصي"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l4260-multifunction-wi-fi-ink-tank-a4-printer%2C-with-up-to-3-years-of-ink-included/p/30601'
      ),
      (
        'EPSON EcoTank L6270', 'ecotank', 'Epson EcoTank', 'A4', 'متعددة الوظائف',
        'طابعة EcoTank مكتبية متعددة الوظائف، تجمع الطباعة والنسخ والمسح مع ADF واتصال شبكي وطباعة تلقائية على الوجهين.',
        '["A4، طباعة ونسخ ومسح، دوبلكس تلقائي، ADF بسعة 30 ورقة، Wi‑Fi وEthernet."]'::jsonb,
        '{"paperSize":"A4","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"PrecisionCore","colorCount":4,"inkType":"أسود صبغي وألوان Dye","wifi":true,"wifiDirect":true,"ethernet":true,"usb":true,"scanner":true,"fax":false,"adf":true,"adfCapacity":30,"duplexMode":"automatic","borderless":true,"mobilePrinting":true,"cdDvdPrinting":false,"plasticCardPrinting":false,"usage":["مكاتب","مجموعات عمل"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l6270-multifunction-wi-fi-ink-tank-a4-printer%2C-with-up-to-3-years-of-ink-included/p/30259'
      ),
      (
        'EPSON EcoTank L6490', 'ecotank', 'Epson EcoTank', 'A4', 'متعددة الوظائف',
        'طابعة EcoTank مكتبية متكاملة بحجم A4، تجمع الطباعة والنسخ والمسح والفاكس مع اتصال شبكي وتجهيزات مناسبة للأعمال.',
        '["A4، طباعة ونسخ ومسح وفاكس، دوبلكس تلقائي، ADF بسعة 35 ورقة، Wi‑Fi وEthernet."]'::jsonb,
        '{"paperSize":"A4","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"inkType":"صبغي","wifi":true,"wifiDirect":true,"ethernet":true,"usb":true,"scanner":true,"fax":true,"adf":true,"adfCapacity":35,"duplexMode":"automatic","borderless":false,"mobilePrinting":true,"cdDvdPrinting":false,"plasticCardPrinting":false,"usage":["مكاتب","أعمال"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l6490-a4-multifunction-wi-fi-ink-tank-printer-with-fax/p/30947'
      ),
      (
        'EPSON EcoTank L8050', 'ecotank-6-color', 'Epson EcoTank Photo', 'A4', 'طابعة صور',
        'طابعة صور EcoTank لاسلكية بحجم A4 ونظام 6 ألوان، مناسبة للصور والبطاقات والأقراص بجودة عالية وتكلفة تشغيل منخفضة.',
        '["طباعة صور A4، 6 ألوان، Wi‑Fi وWi‑Fi Direct، طباعة بلا حدود، تدعم CD/DVD والبطاقات البلاستيكية."]'::jsonb,
        '{"paperSize":"A4","printerType":"طابعة صور","functions":["طباعة"],"printTechnology":"نفث حبر","colorCount":6,"inkType":"Dye","wifi":true,"wifiDirect":true,"ethernet":false,"usb":true,"scanner":false,"fax":false,"adf":false,"duplexMode":"manual","borderless":true,"mobilePrinting":true,"cdDvdPrinting":true,"plasticCardPrinting":true,"usage":["صور","استوديوهات","أقراص","بطاقات"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/consumer/ecotank-l8050-a4-wi-fi-ink-tank-photo-printer/p/34296'
      ),
      (
        'EPSON EcoTank L8180', 'ecotank-6-color', 'Epson EcoTank Photo', 'A3+', 'متعددة الوظائف للصور',
        'طابعة صور EcoTank متقدمة بحجم A3+ ونظام 6 ألوان، تجمع الطباعة والنسخ والمسح مع دعم الوسائط الفنية والاتصال الكامل.',
        '["A3+، طباعة ونسخ ومسح، 6 ألوان، دوبلكس تلقائي A4، Wi‑Fi وEthernet، طباعة بلا حدود وCD/DVD."]'::jsonb,
        '{"paperSize":"A3+","printerType":"متعددة الوظائف للصور","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"نفث حبر","colorCount":6,"inkType":"أسود صبغي، أسود صور، وألوان Dye","wifi":true,"wifiDirect":true,"ethernet":true,"usb":true,"scanner":true,"fax":false,"adf":false,"duplexMode":"automatic","borderless":true,"mobilePrinting":true,"cdDvdPrinting":true,"plasticCardPrinting":null,"usage":["صور احترافية","وسائط فنية","صور A3+"]}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/ecotank-l8180-a3%2B-wi-fi-ink-tank-photo-printer/p/29188'
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
    and product.category = approved.category;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 10 then
    raise exception 'Expected to update exactly 10 EcoTank products, updated %', affected_rows;
  end if;
end
$$;

do $$
declare
  non_target_fingerprint_after text;
  protected_target_fingerprint_after text;
begin
  if (select count(*) from public.products) <> 25 then
    raise exception 'The total product count changed unexpectedly';
  end if;

  if exists (
    select 1
    from public.products as product
    full join ecotank_phase_two_before as old using (id)
    where coalesce(product.name, old.name) not in (
      'EPSON EcoTank L11050', 'EPSON EcoTank L15150', 'EPSON EcoTank L18050',
      'EPSON EcoTank L3210', 'EPSON EcoTank L3250', 'EPSON EcoTank L4260',
      'EPSON EcoTank L6270', 'EPSON EcoTank L6490', 'EPSON EcoTank L8050',
      'EPSON EcoTank L8180'
    )
      and to_jsonb(product) is distinct from to_jsonb(old)
  ) then
    raise exception 'A non-target product changed unexpectedly';
  end if;

  if exists (
    select 1
    from public.products as product
    join ecotank_phase_two_before as old using (id)
    where product.name in (
      'EPSON EcoTank L11050', 'EPSON EcoTank L15150', 'EPSON EcoTank L18050',
      'EPSON EcoTank L3210', 'EPSON EcoTank L3250', 'EPSON EcoTank L4260',
      'EPSON EcoTank L6270', 'EPSON EcoTank L6490', 'EPSON EcoTank L8050',
      'EPSON EcoTank L8180'
    ) and (
      product.name is distinct from old.name
      or product.image is distinct from old.image
      or product.category is distinct from old.category
      or product.price is distinct from old.price
      or product.badge is distinct from old.badge
      or product.sort_order is distinct from old.sort_order
      or product.specifications->'printSpeed' is distinct from old.specifications->'printSpeed'
      or product.specifications->'speedUnit' is distinct from old.specifications->'speedUnit'
    )
  ) then
    raise exception 'A protected field or existing speed value changed unexpectedly';
  end if;

  select
    md5(coalesce(string_agg(to_jsonb(product)::text, '|' order by product.id) filter (
      where product.name not in (
        'EPSON EcoTank L11050', 'EPSON EcoTank L15150', 'EPSON EcoTank L18050',
        'EPSON EcoTank L3210', 'EPSON EcoTank L3250', 'EPSON EcoTank L4260',
        'EPSON EcoTank L6270', 'EPSON EcoTank L6490', 'EPSON EcoTank L8050',
        'EPSON EcoTank L8180'
      )
    ), '')),
    md5(coalesce(string_agg(jsonb_build_object(
      'id', product.id, 'name', product.name, 'image', product.image,
      'category', product.category, 'price', product.price, 'badge', product.badge,
      'sort_order', product.sort_order
    )::text, '|' order by product.id) filter (
      where product.name in (
        'EPSON EcoTank L11050', 'EPSON EcoTank L15150', 'EPSON EcoTank L18050',
        'EPSON EcoTank L3210', 'EPSON EcoTank L3250', 'EPSON EcoTank L4260',
        'EPSON EcoTank L6270', 'EPSON EcoTank L6490', 'EPSON EcoTank L8050',
        'EPSON EcoTank L8180'
      )
    ), ''))
  into non_target_fingerprint_after, protected_target_fingerprint_after
  from public.products as product;

  if exists (
    select 1 from ecotank_phase_two_fingerprints
    where non_target_fingerprint is distinct from non_target_fingerprint_after
      or protected_target_fingerprint is distinct from protected_target_fingerprint_after
  ) then
    raise exception 'A protected comparison fingerprint changed unexpectedly';
  end if;
end
$$;

commit;

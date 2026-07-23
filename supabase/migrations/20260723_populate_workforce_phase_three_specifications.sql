-- Local-only phase-three migration draft for the twelve approved WorkForce products.
-- This file is intentionally not applied to the linked project during local review.

begin;

create temporary table workforce_phase_three_before as
select * from public.products;

create temporary table workforce_phase_three_targets as
select id, name
from public.products
where name in (
  'EPSON WorkForce Pro EM-C800',
  'EPSON WorkForce Pro WF-C8690',
  'EPSON WorkForce Pro WF-C5890',
  'EPSON WorkForce Pro WF-C5390',
  'EPSON WorkForce Pro WF-C7835',
  'EPSON WorkForce Pro WF-C579R',
  'EPSON WorkForce Pro WF-C8610',
  'EPSON WorkForce Pro WF-C878R',
  'EPSON WorkForce Pro AM-C4000 / WF-C4000',
  'EPSON WorkForce Pro AM-C5000 / WF-C5000',
  'EPSON WorkForce Pro AM-C6000 / WF-C6000',
  'EPSON WorkForce Pro WF-C20750'
);

create temporary table workforce_phase_three_fingerprints as
select
  md5(coalesce(string_agg(to_jsonb(product)::text, '|' order by product.id) filter (
    where not exists (
      select 1 from workforce_phase_three_targets as target where target.id = product.id
    )
  ), '')) as non_target_fingerprint,
  md5(coalesce(string_agg(jsonb_build_object(
    'id', product.id,
    'image', product.image,
    'category', product.category,
    'price', product.price,
    'badge', product.badge,
    'sort_order', product.sort_order
  )::text, '|' order by product.id) filter (
    where exists (
      select 1 from workforce_phase_three_targets as target where target.id = product.id
    )
  ), '')) as protected_target_fingerprint
from public.products as product;

do $$
begin
  if (select count(*) from public.products) <> 25 then
    raise exception 'Expected exactly 25 products before the WorkForce phase-three migration';
  end if;

  if (select count(*) from public.products where category = 'workforce') <> 12 then
    raise exception 'Expected exactly 12 WorkForce products before the phase-three migration';
  end if;

  if (select count(*) from workforce_phase_three_targets) <> 12 then
    raise exception 'Every approved WorkForce name must match exactly one product';
  end if;

  if exists (
    select expected.name
    from (values
      ('EPSON WorkForce Pro EM-C800'),
      ('EPSON WorkForce Pro WF-C8690'),
      ('EPSON WorkForce Pro WF-C5890'),
      ('EPSON WorkForce Pro WF-C5390'),
      ('EPSON WorkForce Pro WF-C7835'),
      ('EPSON WorkForce Pro WF-C579R'),
      ('EPSON WorkForce Pro WF-C8610'),
      ('EPSON WorkForce Pro WF-C878R'),
      ('EPSON WorkForce Pro AM-C4000 / WF-C4000'),
      ('EPSON WorkForce Pro AM-C5000 / WF-C5000'),
      ('EPSON WorkForce Pro AM-C6000 / WF-C6000'),
      ('EPSON WorkForce Pro WF-C20750')
    ) as expected(name)
    left join public.products as product on product.name = expected.name
    group by expected.name
    having count(product.id) <> 1
      or bool_or(product.category is distinct from 'workforce')
  ) then
    raise exception 'Every approved WorkForce name must match one WorkForce product only';
  end if;
end
$$;

do $$
declare
  affected_rows integer;
begin
  with approved(old_name, new_name, family, size, type, description, features, specifications, source_url) as (
    values
      (
        'EPSON WorkForce Pro EM-C800',
        'Epson WorkForce Pro EM-C800RDWF',
        'Epson WorkForce Pro',
        'A4',
        'متعددة الوظائف',
        'طابعة أعمال ملونة عالية الإنتاجية بحجم A4، تجمع الطباعة والنسخ والمسح والفاكس مع نظام RIPS لتقليل توقف العمل.',
        '["A4، 25 صفحة/دقيقة، نظام RIPS، ADF بسعة 50 ورقة، سعة ورق 330–1830 ورقة."]'::jsonb,
        '{"paperSize":"A4","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"rips","printSpeed":25,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":true,"faxMode":"builtIn","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":50,"adfDuplexType":"singlePass","standardPaperCapacity":330,"maximumPaperCapacity":1830,"printLanguages":["PCL5c","PCL6","PostScript3","PDF1.7","ESC/P-R"],"finisherSupport":null,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-em-c800rdwf-printer/p/40177'
      ),
      (
        'EPSON WorkForce Pro WF-C8690',
        'EPSON WorkForce Pro WF-C8690',
        'Epson WorkForce Pro',
        'A3+',
        'متعددة الوظائف',
        'طابعة أعمال متعددة الوظائف بحجم A3+، توفر اتصالاً شبكياً متكاملاً وطباعة تلقائية على الوجهين للمجموعات المكتبية.',
        '["A3+، 24 صفحة/دقيقة، خراطيش حبر، ADF بسعة 50 ورقة، سعة ورق 335–1835 ورقة."]'::jsonb,
        '{"paperSize":"A3+","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"cartridges","printSpeed":24,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":true,"faxMode":"builtIn","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":50,"adfDuplexType":null,"standardPaperCapacity":335,"maximumPaperCapacity":1835,"printLanguages":["PCL","PostScript3"],"finisherSupport":null,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-wf-c8690dwf/p/22781'
      ),
      (
        'EPSON WorkForce Pro WF-C5890',
        'EPSON WorkForce Pro WF-C5890',
        'Epson WorkForce Pro',
        'A4',
        'متعددة الوظائف',
        'طابعة أعمال A4 متعددة الوظائف، تجمع الأداء السريع وإدارة المستندات والاتصال اللاسلكي والشبكي.',
        '["A4، 25 صفحة/دقيقة، خراطيش حبر، ADF بسعة 50 ورقة، سعة ورق 330–1830 ورقة."]'::jsonb,
        '{"paperSize":"A4","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"cartridges","printSpeed":25,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":true,"faxMode":"builtIn","duplex":true,"duplexMode":"automatic","duplexScanning":null,"adf":true,"adfCapacity":50,"adfDuplexType":null,"standardPaperCapacity":330,"maximumPaperCapacity":1830,"printLanguages":["PCL5c","PCL6","PostScript3","PDF1.7","ESC/P-R"],"finisherSupport":null,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-wf-c5890dwf-printer/p/34380'
      ),
      (
        'EPSON WorkForce Pro WF-C5390',
        'EPSON WorkForce Pro WF-C5390',
        'Epson WorkForce Pro',
        'A4',
        'طباعة فقط',
        'طابعة أعمال ملونة A4 للطباعة فقط، مصممة لمجموعات العمل مع سعة ورق قابلة للتوسعة.',
        '["A4، طباعة فقط بسرعة 25 صفحة/دقيقة، خراطيش حبر، سعة ورق 330–1830 ورقة."]'::jsonb,
        '{"paperSize":"A4","printerType":"طباعة فقط","functions":["طباعة"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"cartridges","printSpeed":25,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":false,"fax":false,"faxMode":"none","duplex":true,"duplexMode":"automatic","duplexScanning":false,"adf":false,"adfCapacity":null,"adfDuplexType":null,"standardPaperCapacity":330,"maximumPaperCapacity":1830,"printLanguages":["PCL5c","PCL6","PostScript3","PDF1.7","ESC/P-R"],"finisherSupport":null,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-wf-c5390dw/p/34383'
      ),
      (
        'EPSON WorkForce Pro WF-C7835',
        'Epson WorkForce WF-7835DTWF',
        'Epson WorkForce',
        'A3',
        'متعددة الوظائف',
        'طابعة مكتبية متعددة الوظائف بحجم A3، مناسبة للمكاتب الصغيرة وطباعة المستندات والصور بلا حدود.',
        '["A3، 25 صفحة/دقيقة بالأسود، ADF بسعة 50 ورقة، طباعة بلا حدود، سعة ورق 500 ورقة."]'::jsonb,
        '{"paperSize":"A3","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"cartridges","printSpeed":25,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":true,"faxMode":"builtIn","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":50,"adfDuplexType":null,"standardPaperCapacity":500,"maximumPaperCapacity":500,"printLanguages":["ESC/P-R"],"finisherSupport":null,"borderless":true}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/microbusiness/workforce-wf-7835dtwf-a3-multifunction-wireless-inkjet-printer-with-3-months-free-ink-with-readyprint-subscription-/p/27805'
      ),
      (
        'EPSON WorkForce Pro WF-C579R',
        'EPSON WorkForce Pro WF-C579R',
        'Epson WorkForce Pro',
        'A4',
        'متعددة الوظائف',
        'طابعة أعمال A4 متعددة الوظائف بنظام RIPS، توفر طباعة مرتفعة السعة وتدخلاً أقل لتغيير الحبر.',
        '["A4، 24 صفحة/دقيقة، نظام RIPS، ADF بسعة 50 ورقة، سعة ورق 330–1330 ورقة."]'::jsonb,
        '{"paperSize":"A4","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"rips","printSpeed":24,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":true,"faxMode":"builtIn","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":50,"adfDuplexType":null,"standardPaperCapacity":330,"maximumPaperCapacity":1330,"printLanguages":[],"finisherSupport":null,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-wf-c579rdwf-printer/p/23014'
      ),
      (
        'EPSON WorkForce Pro WF-C8610',
        'EPSON WorkForce Pro WF-C8610',
        'Epson WorkForce Pro',
        'A3+',
        'متعددة الوظائف',
        'طابعة أعمال A3+ متعددة الوظائف، تجمع الطباعة والمسح والنسخ والفاكس مع اتصال متكامل.',
        '["A3+، 24 صفحة/دقيقة، خراطيش حبر، ADF بسعة 50 ورقة، سعة ورق 335–1835 ورقة."]'::jsonb,
        '{"paperSize":"A3+","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"cartridges","printSpeed":24,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":true,"faxMode":"builtIn","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":50,"adfDuplexType":null,"standardPaperCapacity":335,"maximumPaperCapacity":1835,"printLanguages":[],"finisherSupport":null,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-wf-c8610dwf/p/22780'
      ),
      (
        'EPSON WorkForce Pro WF-C878R',
        'EPSON WorkForce Pro WF-C878R',
        'Epson WorkForce Pro',
        'A3+',
        'متعددة الوظائف',
        'طابعة أعمال A3+ متعددة الوظائف بنظام RIPS، مصممة للإنتاج المرتفع وتقليل توقف العمل.',
        '["A3+، 25 صفحة/دقيقة بالأسود، نظام RIPS، ADF بسعة 50 ورقة، سعة ورق 335–1835 ورقة."]'::jsonb,
        '{"paperSize":"A3+","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي","فاكس"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"rips","printSpeed":25,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":true,"faxMode":"builtIn","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":50,"adfDuplexType":"singlePass","standardPaperCapacity":335,"maximumPaperCapacity":1835,"printLanguages":[],"finisherSupport":null,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-wf-c878rdwf/p/28788'
      ),
      (
        'EPSON WorkForce Pro AM-C4000 / WF-C4000',
        'Epson WorkForce Enterprise AM-C4000',
        'Epson WorkForce Enterprise',
        'A3',
        'متعددة الوظائف',
        'طابعة مؤسسات A3 متعددة الوظائف بسرعة 40 صفحة في الدقيقة، مع مسح سريع وسعة ورق كبيرة وخيارات تشطيب.',
        '["A3، 40 صفحة/دقيقة، نظام حبر مؤسسي، ADF بسعة 150 ورقة، سعة ورق 1150–5150 ورقة."]'::jsonb,
        '{"paperSize":"A3","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"enterprise","printSpeed":40,"speedUnit":"صفحة/دقيقة","wifi":null,"wifiAvailability":"optional","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":null,"faxMode":"optional","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":150,"adfDuplexType":"singlePass","standardPaperCapacity":1150,"maximumPaperCapacity":5150,"printLanguages":[],"finisherSupport":true,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-enterprise%E2%80%8B-am-c4000%E2%80%8B-printer/p/34957'
      ),
      (
        'EPSON WorkForce Pro AM-C5000 / WF-C5000',
        'Epson WorkForce Enterprise AM-C5000',
        'Epson WorkForce Enterprise',
        'A3',
        'متعددة الوظائف',
        'طابعة مؤسسات A3 متعددة الوظائف بسرعة 50 صفحة في الدقيقة، للإدارات التي تحتاج إنتاجية عالية.',
        '["A3، 50 صفحة/دقيقة، نظام حبر مؤسسي، ADF بسعة 150 ورقة، سعة ورق 1150–5150 ورقة."]'::jsonb,
        '{"paperSize":"A3","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"enterprise","printSpeed":50,"speedUnit":"صفحة/دقيقة","wifi":null,"wifiAvailability":"optional","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":null,"faxMode":"optional","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":150,"adfDuplexType":"singlePass","standardPaperCapacity":1150,"maximumPaperCapacity":5150,"printLanguages":[],"finisherSupport":true,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-enterprise%E2%80%8B-am-c5000%E2%80%8B-printer/p/34978'
      ),
      (
        'EPSON WorkForce Pro AM-C6000 / WF-C6000',
        'Epson WorkForce Enterprise AM-C6000',
        'Epson WorkForce Enterprise',
        'A3',
        'متعددة الوظائف',
        'طابعة مؤسسات A3 متعددة الوظائف بسرعة 60 صفحة في الدقيقة، للأعمال الكبيرة وأحجام الطباعة المرتفعة.',
        '["A3، 60 صفحة/دقيقة، نظام حبر مؤسسي، ADF بسعة 150 ورقة، سعة ورق 1150–5150 ورقة."]'::jsonb,
        '{"paperSize":"A3","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"enterprise","printSpeed":60,"speedUnit":"صفحة/دقيقة","wifi":null,"wifiAvailability":"optional","wifiDirect":null,"nfc":null,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":null,"faxMode":"optional","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":150,"adfDuplexType":"singlePass","standardPaperCapacity":1150,"maximumPaperCapacity":5150,"printLanguages":[],"finisherSupport":true,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-enterprise%E2%80%8B-am-c6000%E2%80%8B-printer/p/34981'
      ),
      (
        'EPSON WorkForce Pro WF-C20750',
        'Epson WorkForce Enterprise WF-C20750',
        'Epson WorkForce Enterprise',
        'A3+/SRA3',
        'متعددة الوظائف',
        'طابعة مؤسسات ملونة فائقة الإنتاجية بسرعة 75 صفحة في الدقيقة، مع مسح مزدوج سريع وخيارات تشطيب احترافية.',
        '["A3+/SRA3، 75 صفحة/دقيقة، نظام حبر مؤسسي، ADF بسعة 150 ورقة، سعة ورق 2350–5350 ورقة."]'::jsonb,
        '{"paperSize":"A3+/SRA3","printerType":"متعددة الوظائف","functions":["طباعة","نسخ","مسح ضوئي"],"printTechnology":"PrecisionCore","colorCount":4,"colorMode":"ملونة","inkType":"حبر صبغي","inkSystem":"enterprise","printSpeed":75,"speedUnit":"صفحة/دقيقة","wifi":true,"wifiAvailability":"builtIn","wifiDirect":true,"nfc":true,"ethernet":true,"usb":true,"mobilePrinting":true,"scanner":true,"fax":null,"faxMode":"optional","duplex":true,"duplexMode":"automatic","duplexScanning":true,"adf":true,"adfCapacity":150,"adfDuplexType":"singlePass","standardPaperCapacity":2350,"maximumPaperCapacity":5350,"printLanguages":["PCL5","PCL6","PostScript3"],"finisherSupport":true,"borderless":null}'::jsonb,
        'https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-enterprise-wf-c20750-d4tw/p/29266'
      )
  )
  update public.products as product
  set
    name = approved.new_name,
    family = approved.family,
    size = approved.size,
    type = approved.type,
    description = approved.description,
    features = approved.features,
    specifications = coalesce(product.specifications, '{}'::jsonb) || approved.specifications,
    specifications_source_url = approved.source_url,
    specifications_verified_at = current_timestamp
  from approved
  where product.name = approved.old_name
    and product.category = 'workforce';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 12 then
    raise exception 'Expected to update exactly 12 WorkForce products, updated %', affected_rows;
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

  if (select count(*) from public.products where category = 'workforce') <> 12 then
    raise exception 'The WorkForce product count changed unexpectedly';
  end if;

  if exists (
    select 1
    from public.products as product
    full join workforce_phase_three_before as old using (id)
    where not exists (
      select 1 from workforce_phase_three_targets as target where target.id = coalesce(product.id, old.id)
    )
      and to_jsonb(product) is distinct from to_jsonb(old)
  ) then
    raise exception 'A non-target product changed unexpectedly';
  end if;

  if exists (
    select 1
    from public.products as product
    join workforce_phase_three_before as old using (id)
    join workforce_phase_three_targets as target on target.id = product.id
    where product.image is distinct from old.image
      or product.category is distinct from old.category
      or product.price is distinct from old.price
      or product.badge is distinct from old.badge
      or product.sort_order is distinct from old.sort_order
      or product.id is distinct from old.id
  ) then
    raise exception 'A protected WorkForce field changed unexpectedly';
  end if;

  if exists (
    select 1
    from (values
      ('EPSON WorkForce Pro EM-C800', 'Epson WorkForce Pro EM-C800RDWF'),
      ('EPSON WorkForce Pro WF-C8690', 'EPSON WorkForce Pro WF-C8690'),
      ('EPSON WorkForce Pro WF-C5890', 'EPSON WorkForce Pro WF-C5890'),
      ('EPSON WorkForce Pro WF-C5390', 'EPSON WorkForce Pro WF-C5390'),
      ('EPSON WorkForce Pro WF-C7835', 'Epson WorkForce WF-7835DTWF'),
      ('EPSON WorkForce Pro WF-C579R', 'EPSON WorkForce Pro WF-C579R'),
      ('EPSON WorkForce Pro WF-C8610', 'EPSON WorkForce Pro WF-C8610'),
      ('EPSON WorkForce Pro WF-C878R', 'EPSON WorkForce Pro WF-C878R'),
      ('EPSON WorkForce Pro AM-C4000 / WF-C4000', 'Epson WorkForce Enterprise AM-C4000'),
      ('EPSON WorkForce Pro AM-C5000 / WF-C5000', 'Epson WorkForce Enterprise AM-C5000'),
      ('EPSON WorkForce Pro AM-C6000 / WF-C6000', 'Epson WorkForce Enterprise AM-C6000'),
      ('EPSON WorkForce Pro WF-C20750', 'Epson WorkForce Enterprise WF-C20750')
    ) as expected(old_name, new_name)
    join workforce_phase_three_targets as target on target.name = expected.old_name
    left join public.products as product on product.id = target.id and product.name = expected.new_name
    where product.id is null
  ) then
    raise exception 'A WorkForce name differs from the approved old-to-new mapping';
  end if;

  select
    md5(coalesce(string_agg(to_jsonb(product)::text, '|' order by product.id) filter (
      where not exists (
        select 1 from workforce_phase_three_targets as target where target.id = product.id
      )
    ), '')),
    md5(coalesce(string_agg(jsonb_build_object(
      'id', product.id,
      'image', product.image,
      'category', product.category,
      'price', product.price,
      'badge', product.badge,
      'sort_order', product.sort_order
    )::text, '|' order by product.id) filter (
      where exists (
        select 1 from workforce_phase_three_targets as target where target.id = product.id
      )
    ), ''))
  into non_target_fingerprint_after, protected_target_fingerprint_after
  from public.products as product;

  if exists (
    select 1
    from workforce_phase_three_fingerprints
    where non_target_fingerprint is distinct from non_target_fingerprint_after
      or protected_target_fingerprint is distinct from protected_target_fingerprint_after
  ) then
    raise exception 'A protected WorkForce comparison fingerprint changed unexpectedly';
  end if;
end
$$;

commit;

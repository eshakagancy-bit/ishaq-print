-- Safe, idempotent live-data migration.
-- It changes only the category of the 12 verified WorkForce products.

begin;

update public.products
set category = 'workforce'
where category = 'printers'
  and (id, name) in (
    (1784646662025, 'Epson WorkForce Pro EM-C800'),
    (1784646618603, 'Epson WorkForce Pro WF-C8690'),
    (1784646445851, 'Epson WorkForce Pro WF-C5890'),
    (1784646231295, 'Epson WorkForce Pro WF-C5390'),
    (1784573743180, 'Epson WorkForce Pro WF-C7835'),
    (1784573705610, 'Epson WorkForce Pro WF-C579R'),
    (1784573671884, 'Epson WorkForce Pro WF-C8610'),
    (1784573642246, 'Epson WorkForce Pro WF-C878R'),
    (1784573559103, 'Epson WorkForce Pro AM-C5000 / WF-C5000'),
    (1784573531690, 'Epson WorkForce Pro AM-C4000 / WF-C4000'),
    (1784573512133, 'Epson WorkForce Pro AM-C6000 / WF-C6000'),
    (1784573491085, 'Epson WorkForce Pro WF-C20750')
  );

commit;

import { writeFile } from "node:fs/promises";
import { assertPrinterPageContent } from "./arabic-content-integrity.mjs";
import { PRINTER_SPECIFICATION_TARGETS } from "./update-printer-specifications.mjs";

const migrationUrl = new URL("../supabase/migrations/20260826230000_standardize_printer_detail_content.sql", import.meta.url);
const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`;

for (const target of PRINTER_SPECIFICATION_TARGETS) {
  assertPrinterPageContent(target.pageContent, `migration.${target.model}`);
}

const rows = PRINTER_SPECIFICATION_TARGETS.map((target) => `    (${sqlText(target.model)}, ${sqlText(target.description)}, ${sqlText(JSON.stringify(target.pageContent))}::jsonb)`).join(",\n");

const migration = `begin;

create temporary table desired_printer_content (
  model text primary key,
  description text not null,
  page_content jsonb not null
) on commit drop;

insert into desired_printer_content (model, description, page_content)
values
${rows};

do $$
declare
  missing_models text;
begin
  with missing as (
    select desired.model
    from desired_printer_content desired
    where not exists (
      select 1
      from products
      where regexp_replace(upper(name), '[^A-Z0-9]', '', 'g') like '%' || regexp_replace(upper(desired.model), '[^A-Z0-9]', '', 'g')
    )
  )
  select string_agg(model, ', ' order by model) into missing_models from missing;

  if missing_models is not null then
    raise exception 'Printer content migration aborted; missing models: %', missing_models;
  end if;
end $$;

update products
set
  description = desired.description,
  printer_page_content = coalesce(products.printer_page_content, '{}'::jsonb) || desired.page_content,
  updated_at = now()
from desired_printer_content desired
where regexp_replace(upper(products.name), '[^A-Z0-9]', '', 'g') like '%' || regexp_replace(upper(desired.model), '[^A-Z0-9]', '', 'g');

commit;
`;

await writeFile(migrationUrl, migration, "utf8");
console.log(migrationUrl.pathname);

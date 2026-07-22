-- Adds optional structured printer specifications without changing existing rows.

begin;

alter table public.products
  add column if not exists specifications jsonb,
  add column if not exists specifications_source_url text,
  add column if not exists specifications_verified_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_specifications_is_object'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_specifications_is_object
      check (specifications is null or jsonb_typeof(specifications) = 'object')
      not valid;
  end if;
end
$$;

alter table public.products
  validate constraint products_specifications_is_object;

commit;

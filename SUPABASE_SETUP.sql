-- ABA Learning Portal v20 — Supabase Cloud Sync
-- Chạy TOÀN BỘ file này trong Supabase Dashboard > SQL Editor > New query > Run.

create table if not exists public.aba_app_state (
  id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);

insert into public.aba_app_state (id, data, version)
values (1, '{}'::jsonb, 0)
on conflict (id) do nothing;

alter table public.aba_app_state enable row level security;

-- Không cho người chưa đăng nhập đọc/ghi.
revoke all on table public.aba_app_state from anon;

-- Chỉ tài khoản Supabase đã đăng nhập mới được dùng Portal Cloud.
grant select, insert, update on table public.aba_app_state to authenticated;

drop policy if exists "ABA authenticated read" on public.aba_app_state;
create policy "ABA authenticated read"
on public.aba_app_state
for select
to authenticated
using (id = 1);

drop policy if exists "ABA authenticated update" on public.aba_app_state;
create policy "ABA authenticated update"
on public.aba_app_state
for update
to authenticated
using (id = 1)
with check (id = 1);

drop policy if exists "ABA authenticated insert" on public.aba_app_state;
create policy "ABA authenticated insert"
on public.aba_app_state
for insert
to authenticated
with check (id = 1);

-- Bật Realtime cho bảng. Nếu đã bật rồi thì bỏ qua lỗi "already member".
do $$
begin
  alter publication supabase_realtime add table public.aba_app_state;
exception
  when duplicate_object then null;
end $$;

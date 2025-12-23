-- Create function to handle new auth users: create profile and roles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_admin boolean;
begin
  -- Create basic profile for the user if not exists
  insert into public.profiles (id, display_name, username, whatsapp)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', null),
    coalesce(new.raw_user_meta_data->>'username', null),
    coalesce(new.raw_user_meta_data->>'whatsapp', null)
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    username = excluded.username,
    whatsapp = excluded.whatsapp,
    updated_at = now();

  -- Check if there is already any admin
  select not exists (
    select 1 from public.user_roles where role = 'admin'
  ) into is_first_admin;

  -- Every user gets at least CLIENT role
  insert into public.user_roles (user_id, role)
  values (new.id, 'client')
  on conflict (user_id, role) do nothing;

  -- First user becomes ADMIN as well
  if is_first_admin then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

-- Trigger on auth.users to call handle_new_user after signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- Fortalecer atribuição de roles baseada em códigos de convite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_first_admin boolean;
  invite_role public.app_role;
BEGIN
  -- Cria/atualiza perfil básico para o usuário
  INSERT INTO public.profiles (id, display_name, username, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    username = EXCLUDED.username,
    whatsapp = EXCLUDED.whatsapp,
    updated_at = now();

  -- Verifica se já existe algum ADMIN cadastrado
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO is_first_admin;

  -- Todo usuário recebe pelo menos o papel CLIENT
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Se houver um código de convite vinculado, usa o role do invite_codes
  SELECT ic.role
  INTO invite_role
  FROM public.invite_codes ic
  WHERE ic.used_by = NEW.id
    AND ic.status = 'used'
  ORDER BY ic.created_at DESC
  LIMIT 1;

  IF invite_role IS NOT NULL AND invite_role <> 'client' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Primeiro usuário do sistema também vira ADMIN
  IF is_first_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
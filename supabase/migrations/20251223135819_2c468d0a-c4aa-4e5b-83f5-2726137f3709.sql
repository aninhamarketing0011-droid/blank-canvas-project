-- SECURITY FIXES FOR CHAT APP

-- 1) Fix overly permissive profiles policy
-- Remove broad auth-only policy and rely on existing fine-grained policies
DROP POLICY IF EXISTS "Profiles require authentication" ON public.profiles;

-- (Existing policies already restrict profiles to self or admins.)

-- 2) Fix overly permissive orders policy
-- Remove auth-only policy and rely on 'Orders visible to related users'
DROP POLICY IF EXISTS "Orders require authentication" ON public.orders;

-- 3) Add explicit restrictive UPDATE/DELETE policies for chats
-- Only participants or admins can update or delete chats.

CREATE POLICY "Chats update by participants or admin"
ON public.chats
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = id AND cp.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Chats delete by participants or admin"
ON public.chats
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = id AND cp.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);
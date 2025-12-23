-- Add vendor access expiration to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS vendor_access_expires_at timestamptz;

-- Add blocking and expiration per connection for vendor_connections
ALTER TABLE public.vendor_connections
ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

-- Allow admins to view all vendor connections
CREATE POLICY "Vendor connections admin view"
ON public.vendor_connections
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admins to update vendor connections (for future fine-grained blocks)
CREATE POLICY "Vendor connections admin update"
ON public.vendor_connections
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
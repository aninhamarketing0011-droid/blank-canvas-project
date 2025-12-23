-- Ensure RLS is enabled and anonymous users cannot read sensitive data

-- 1) PROFILES: protect personal data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Extra safety policy so anonymous users never see profiles
CREATE POLICY "Profiles require authentication"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2) ORDERS: protect purchase history and locations
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Extra safety policy so anonymous users never see orders
CREATE POLICY "Orders require authentication"
ON public.orders
FOR SELECT
USING (auth.uid() IS NOT NULL);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE;

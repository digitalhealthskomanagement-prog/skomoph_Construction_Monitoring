ALTER TABLE public.user_roles ADD COLUMN unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE;

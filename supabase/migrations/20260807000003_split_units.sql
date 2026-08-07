-- 1. Create units table
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  district text,
  province text DEFAULT 'สระแก้ว',
  lat numeric,
  lng numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Super admins can manage units" ON public.units FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin')
);
CREATE POLICY "Unit admins can update their units" ON public.units FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.unit_id = units.id)
);

-- 2. Move distinct units from projects
INSERT INTO public.units (id, name, type, district, province, lat, lng, created_at, updated_at)
SELECT id, unit_name, unit_type, district, province, lat, lng, created_at, updated_at
FROM public.projects
WHERE unit_name IS NOT NULL;

-- 3. Link projects to units
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE;

-- 4. Set unit_id for existing projects (which are currently units themselves)
UPDATE public.projects SET unit_id = id;

-- 5. Drop unit-specific columns from projects
ALTER TABLE public.projects 
  DROP COLUMN IF EXISTS unit_name, 
  DROP COLUMN IF EXISTS unit_type, 
  DROP COLUMN IF EXISTS district, 
  DROP COLUMN IF EXISTS province, 
  DROP COLUMN IF EXISTS lat, 
  DROP COLUMN IF EXISTS lng;

-- 6. Link user_roles to units instead of projects
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE;
UPDATE public.user_roles SET unit_id = project_id;
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS project_id;

-- Enable real-time for units
ALTER PUBLICATION supabase_realtime ADD TABLE public.units;

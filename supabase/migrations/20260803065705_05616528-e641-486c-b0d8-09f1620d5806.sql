ALTER TABLE public.project_settings
  ADD COLUMN IF NOT EXISTS hero_image_path text,
  ADD COLUMN IF NOT EXISTS org_name text,
  ADD COLUMN IF NOT EXISTS org_tagline text,
  ADD COLUMN IF NOT EXISTS intro_text text,
  ADD COLUMN IF NOT EXISTS prep_heading text,
  ADD COLUMN IF NOT EXISTS prep_subtitle text,
  ADD COLUMN IF NOT EXISTS cons_heading text,
  ADD COLUMN IF NOT EXISTS cons_subtitle text,
  ADD COLUMN IF NOT EXISTS calendar_start_month date;

CREATE TABLE IF NOT EXISTS public.resource_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  description text,
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'link',
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.resource_links TO anon;
GRANT SELECT ON public.resource_links TO authenticated;
GRANT ALL ON public.resource_links TO service_role;

ALTER TABLE public.resource_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read resource links" ON public.resource_links;
CREATE POLICY "public read resource links" ON public.resource_links FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_resource_links_updated_at ON public.resource_links;
CREATE TRIGGER update_resource_links_updated_at
BEFORE UPDATE ON public.resource_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.resource_links (label, description, url, icon, "order")
SELECT 'Google Drive', 'โฟลเดอร์เอกสาร แบบแปลน และไฟล์โครงการ', 'https://drive.google.com/drive/folders/16t4li6L8jyQRwWDsUhszad9kvE2eOL6W?usp=drive_link', 'folder', 0
WHERE NOT EXISTS (SELECT 1 FROM public.resource_links);

INSERT INTO public.resource_links (label, description, url, icon, "order")
SELECT 'NotebookLM', 'สรุปและถาม-ตอบเอกสารโครงการด้วย AI', 'https://notebooklm.google.com/notebook/a0889a1d-e641-4b16-946c-73957e4d44af', 'notebook', 1
WHERE NOT EXISTS (SELECT 1 FROM public.resource_links WHERE icon = 'notebook');
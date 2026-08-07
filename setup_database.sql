
-- Project settings (singleton row)
CREATE TABLE public.project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_progress numeric NOT NULL DEFAULT 0,
  budget_baht bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_settings TO anon, authenticated;
GRANT ALL ON public.project_settings TO service_role;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.project_settings FOR SELECT USING (true);

-- Phases
CREATE TABLE public.phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "order" int NOT NULL DEFAULT 0,
  progress numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#0ea5e9',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.phases TO anon, authenticated;
GRANT ALL ON public.phases TO service_role;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read phases" ON public.phases FOR SELECT USING (true);

-- Calendar events
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text NOT NULL DEFAULT 'task',
  phase_id uuid REFERENCES public.phases(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.calendar_events TO anon, authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read events" ON public.calendar_events FOR SELECT USING (true);

-- Updates feed
CREATE TABLE public.updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  reporter_name text,
  phase_id uuid REFERENCES public.phases(id) ON DELETE SET NULL,
  progress_snapshot numeric,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.updates TO anon, authenticated;
GRANT ALL ON public.updates TO service_role;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read updates" ON public.updates FOR SELECT USING (true);

-- Seed project + phases
INSERT INTO public.project_settings (title, subtitle, start_date, end_date, total_progress)
VALUES (
  'อาคารผู้ป่วยนอก–ผู้ป่วยหนัก–ผ่าตัด–ผู้ป่วยใน 5 ชั้น',
  'โรงพยาบาลสรรคบุรี ปีงบประมาณ 2570–2572',
  '2026-10-01',
  '2029-09-30',
  0
);

INSERT INTO public.phases (name, "order", progress, color, start_date, end_date) VALUES
  ('ออกแบบและเตรียมการ', 1, 0, '#0ea5e9', '2026-10-01', '2027-01-31'),
  ('จัดซื้อจัดจ้าง', 2, 0, '#6366f1', '2027-02-01', '2027-04-30'),
  ('งานฐานราก', 3, 0, '#8b5cf6', '2027-05-01', '2027-09-30'),
  ('งานโครงสร้าง', 4, 0, '#ec4899', '2027-10-01', '2028-06-30'),
  ('งานสถาปัตย์', 5, 0, '#f97316', '2028-04-01', '2028-12-31'),
  ('งานระบบ (ไฟฟ้า/สุขาภิบาล/ปรับอากาศ)', 6, 0, '#eab308', '2028-07-01', '2029-03-31'),
  ('งานตกแต่งภายในและครุภัณฑ์', 7, 0, '#22c55e', '2029-01-01', '2029-07-31'),
  ('ตรวจรับและส่งมอบ', 8, 0, '#14b8a6', '2029-08-01', '2029-09-30');

CREATE POLICY "public read updates images" ON storage.objects
  FOR SELECT USING (bucket_id = 'updates');

ALTER TABLE public.phases
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'construction',
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS duration_label text;

DELETE FROM public.phases;

-- Preparation phases (1.1 - 1.15)
INSERT INTO public.phases (category, code, name, "order", color, duration_label, start_date, end_date) VALUES
('preparation','1.1','เสนอแต่งตั้งคณะกรรมการกำหนดขอบเขตงาน (TOR) และราคากลาง',101,'#0ea5e9','5 วัน','2026-09-01','2026-09-05'),
('preparation','1.2','คณะกรรมการฯ จัดทำแบบรูปรายการและราคากลาง',102,'#0ea5e9','20 วัน','2026-09-06','2026-09-25'),
('preparation','1.3','เสนอรายงานผลราคากลาง และขอความเห็นชอบ',103,'#0ea5e9','1 วัน','2026-09-26','2026-09-26'),
('preparation','1.4','จัดทำรายงานขอซื้อขอจ้าง พร้อมแต่งตั้งคณะกรรมการพิจารณาผลฯ',104,'#0ea5e9','6 วัน','2026-09-27','2026-10-02'),
('preparation','1.5','เผยแพร่ร่างประกาศเพื่อรับฟังคำวิจารณ์ (7 วันทำการ)',105,'#0ea5e9','11 วัน','2026-10-03','2026-10-13'),
('preparation','1.6','รายงานผลรับฟังความคิดเห็น และผู้บริหารลงนามประกาศเชิญชวน',106,'#0ea5e9','1 วัน','2026-10-14','2026-10-14'),
('preparation','1.7','เผยแพร่ประกาศประกวดราคา e-bidding (20 วันทำการ)',107,'#0ea5e9','28 วัน','2026-10-15','2026-11-11'),
('preparation','1.8','ผู้เสนอราคายื่นข้อเสนอทางระบบอิเล็กทรอนิกส์',108,'#0ea5e9','1 วัน','2026-11-12','2026-11-12'),
('preparation','1.9','คณะกรรมการพิจารณาผลการประกวดราคาฯ',109,'#0ea5e9','5 วัน','2026-11-13','2026-11-17'),
('preparation','1.10','รายงานผลการพิจารณาให้ผู้มีอำนาจลงนาม',110,'#0ea5e9','1 วัน','2026-11-18','2026-11-18'),
('preparation','1.11','ประกาศผู้ชนะการเสนอราคา',111,'#0ea5e9','1 วัน','2026-11-19','2026-11-19'),
('preparation','1.12','เว้นระยะเวลาอุทธรณ์ (7 วันทำการ)',112,'#0ea5e9','11 วัน','2026-11-20','2026-11-30'),
('preparation','1.13','รายงานผลอุทธรณ์ / เสนอผู้บริหารเรียกทำสัญญา',113,'#0ea5e9','1 วัน','2026-12-01','2026-12-01'),
('preparation','1.14','ผู้รับจ้างเตรียมหลักประกัน และตรวจสอบเอกสารเพื่อลงนาม',114,'#0ea5e9','17 วัน','2026-12-02','2026-12-18'),
('preparation','1.15','ผู้มีอำนาจลงนามสัญญาจ้างก่อสร้าง (เริ่มต้นนับเวลาก่อสร้าง)',115,'#0ea5e9','1 วัน','2026-12-19','2026-12-19');

-- Construction milestones (งวดที่ 1 - 16)
INSERT INTO public.phases (category, code, name, "order", color, duration_label, weight, start_date, end_date) VALUES
('construction','งวดที่ 1','รื้อถอน, ปรับพื้นที่, ปักผัง, เจาะสำรวจดิน, ก่อสร้างเสาเข็มและทดสอบ',201,'#f59e0b','ภายใน 90 วัน',4.00,'2026-12-19','2027-03-19'),
('construction','งวดที่ 2','ก่อสร้างฐานราก, ตอม่อ, ถังเก็บน้ำใต้ดิน, ช่องลิฟต์/ผนัง ค.ส.ล. ชั้น 1, เดินท่อระบบ',202,'#f59e0b','ภายใน 150 วัน',3.50,'2027-03-20','2027-05-18'),
('construction','งวดที่ 3','โครงสร้างพื้น-คาน ชั้น 1, บันได, เสารับชั้น 2, ช่องลิฟต์ชั้น 2, ฝังท่อในคอนกรีต',203,'#f59e0b','ภายใน 180 วัน',3.00,'2027-05-19','2027-06-17'),
('construction','งวดที่ 4','โครงสร้างพื้น-คาน ชั้น 2, บันได, เสารับชั้น 3, ช่องลิฟต์ชั้น 3, ฝังท่อในคอนกรีต',204,'#f59e0b','ภายใน 210 วัน',2.50,'2027-06-18','2027-07-17'),
('construction','งวดที่ 5','โครงสร้างพื้น-คาน ชั้น 3, เสารับชั้น 4, ก่ออิฐชั้น 1, เดินท่อระบบสุขาภิบาล/ไฟฟ้าชั้น 1',205,'#f59e0b','ภายใน 240 วัน',3.00,'2027-07-18','2027-08-16'),
('construction','งวดที่ 6','โครงสร้างพื้น-คาน ชั้น 4, เสารับชั้น 5, ก่ออิฐชั้น 2, เดินท่อระบบชั้น 1-2',206,'#f59e0b','ภายใน 270 วัน',4.00,'2027-08-17','2027-09-15'),
('construction','งวดที่ 7','โครงสร้างพื้น-คาน ชั้น 5, เสารับชั้นดาดฟ้า, ก่ออิฐชั้น 3, ฉาบปูนชั้น 1, เดินท่อระบบชั้น 2-3',207,'#f59e0b','ภายใน 315 วัน',4.25,'2027-09-16','2027-10-30'),
('construction','งวดที่ 8','โครงสร้างพื้นดาดฟ้า, หลังคา, ก่ออิฐชั้น 4, ฉาบปูนชั้น 2, ปูกระเบื้อง/หินขัดชั้น 1',208,'#f59e0b','ภายใน 360 วัน',5.25,'2027-10-31','2027-12-14'),
('construction','งวดที่ 9','ก่ออิฐส่วนที่เหลือ, ฉาบปูนชั้น 3, ปูกระเบื้อง/หินขัดชั้น 2, เดินท่อ/สายไฟชั้น 3-5',209,'#f59e0b','ภายใน 405 วัน',3.00,'2027-12-15','2028-01-28'),
('construction','งวดที่ 10','ฉาบปูนชั้น 4, ปูกระเบื้อง/หินขัดชั้น 3, ติดตั้งถังน้ำสแตนเลส, เดินท่อเมนแนวดิ่งทั้งหมด',210,'#f59e0b','ภายใน 450 วัน',2.50,'2028-01-29','2028-03-14'),
('construction','งวดที่ 11','ติดตั้งฝ้าเพดานชั้น 1-2, ฉาบปูนภายนอก/ภายในที่เหลือ, งานพื้นชั้น 4, บ่อพักน้ำ/ท่อระบาย',211,'#f59e0b','ภายใน 500 วัน',6.50,'2028-03-15','2028-05-03'),
('construction','งวดที่ 12','ติดตั้งฝ้าชั้น 3-4, ปูกระเบื้องที่เหลือ, ติดตั้งผนังห้องผ่าตัด, ประตู-หน้าต่างชั้น 1-2',212,'#f59e0b','ภายใน 545 วัน',10.00,'2028-05-04','2028-06-17'),
('construction','งวดที่ 13','ฝ้าเพดานที่เหลือ, ผิวพื้นภายนอก, ประตู-หน้าต่างชั้น 3-4, สุขภัณฑ์, แอร์ชั้น 4-5, ทาสีรองพื้น',213,'#f59e0b','ภายใน 590 วัน',9.50,'2028-06-18','2028-08-01'),
('construction','งวดที่ 14','ตกแต่งแผ่นคอมโพสิท, กันซึมหลังคา, ติดตั้งเครื่องกำเนิดไฟฟ้า, ระบบกันฟ้าผ่า, ทาสีจริงชั้น 1-2',214,'#f59e0b','ภายใน 640 วัน',14.00,'2028-08-02','2028-09-20'),
('construction','งวดที่ 15','กระเบื้องยาง, หม้อแปลงไฟฟ้า, ลิฟต์, ระบบสื่อสาร (โทรศัพท์, CCTV, เรียกพยาบาล)',215,'#f59e0b','ภายใน 685 วัน',10.00,'2028-09-21','2028-11-04'),
('construction','งวดที่ 16','ทาสีที่เหลือ, ติดตั้งอุปกรณ์จ่ายแก๊ส, ทดสอบระบบ, ส่งคู่มือ/As-Built (BIM), ทำความสะอาด',216,'#f59e0b','ภายใน 730 วัน',15.00,'2028-11-05','2028-12-19');
CREATE TABLE public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid REFERENCES public.phases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  mitigation text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','monitoring','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.risks TO anon, authenticated;
GRANT ALL ON public.risks TO service_role;

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read risks" ON public.risks FOR SELECT USING (true);

CREATE INDEX risks_phase_id_idx ON public.risks(phase_id);ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'::text[];
UPDATE public.updates SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND cardinality(image_urls) = 0;ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS thumb_urls text[] NOT NULL DEFAULT '{}';ALTER TABLE public.project_settings
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
WHERE NOT EXISTS (SELECT 1 FROM public.resource_links WHERE icon = 'notebook');-- Rename project_settings to projects
ALTER TABLE public.project_settings RENAME TO projects;

-- Add service unit specific columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS unit_name text,
ADD COLUMN IF NOT EXISTS unit_type text, -- 'hospital', 'health_center', 'sso'
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS province text DEFAULT 'สระแก้ว',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lat numeric,
ADD COLUMN IF NOT EXISTS lng numeric;

-- Backfill unit_name for the existing record (if any)
UPDATE public.projects SET unit_name = 'โรงพยาบาลสรรคบุรี', unit_type = 'hospital', is_active = true WHERE unit_name IS NULL;

-- Add project_id to phases, calendar_events, updates, risks
ALTER TABLE public.phases ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update existing records to point to the first project
DO $$ 
DECLARE 
  first_project_id uuid;
BEGIN
  SELECT id INTO first_project_id FROM public.projects LIMIT 1;
  IF first_project_id IS NOT NULL THEN
    UPDATE public.phases SET project_id = first_project_id WHERE project_id IS NULL;
    UPDATE public.calendar_events SET project_id = first_project_id WHERE project_id IS NULL;
    UPDATE public.updates SET project_id = first_project_id WHERE project_id IS NULL;
    UPDATE public.risks SET project_id = first_project_id WHERE project_id IS NULL;
  END IF;
END $$;

-- User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, 
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'unit_admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read user_roles" ON public.user_roles;
CREATE POLICY "public read user_roles" ON public.user_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "users can insert their own role on registration" ON public.user_roles;
CREATE POLICY "users can insert their own role on registration" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "super_admins can manage all roles" ON public.user_roles;
CREATE POLICY "super_admins can manage all roles" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- SEED DATA
INSERT INTO public.projects (title, unit_name, unit_type, district, province, start_date, end_date) VALUES
('โครงการก่อสร้าง รพ.สต.คลองเจริญ', 'รพ.สต.คลองเจริญ', 'health_center', 'เขาฉกรรจ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ซับมะนาว', 'รพ.สต.ซับมะนาว', 'health_center', 'เขาฉกรรจ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองหว้า', 'รพ.สต.หนองหว้า', 'health_center', 'เขาฉกรรจ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.เขาฉกรรจ์', 'รพ.สต.เขาฉกรรจ์', 'health_center', 'เขาฉกรรจ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.เขาสามสิบ', 'รพ.สต.เขาสามสิบ', 'health_center', 'เขาฉกรรจ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ไทรทอง', 'รพ.สต.ไทรทอง', 'health_center', 'เขาฉกรรจ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองน้ำใส', 'รพ.สต.คลองน้ำใส', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองบุหรี่', 'รพ.สต.คลองบุหรี่', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองปลาโด', 'รพ.สต.คลองปลาโด', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองผักขม', 'รพ.สต.คลองผักขม', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองมะละกอ', 'รพ.สต.คลองมะละกอ', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองหมากนัด', 'รพ.สต.คลองหมากนัด', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ท่ากะบาก', 'รพ.สต.ท่ากะบาก', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ท่าเกษม', 'รพ.สต.ท่าเกษม', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ท่าแยก', 'รพ.สต.ท่าแยก', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บะขมิ้น', 'รพ.สต.บะขมิ้น', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านน้ำซับเจริญ', 'รพ.สต.บ้านน้ำซับเจริญ', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านแก่งสีเสียด', 'รพ.สต.บ้านแก่งสีเสียด', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านแก้ง', 'รพ.สต.บ้านแก้ง', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ลุงพลู', 'รพ.สต.ลุงพลู', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ศาลาลำดวน', 'รพ.สต.ศาลาลำดวน', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองไทร', 'รพ.สต.หนองไทร', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.เขามะกา', 'รพ.สต.เขามะกา', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.เขาสิงห์โต', 'รพ.สต.เขาสิงห์โต', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.เนินแสนสุข', 'รพ.สต.เนินแสนสุข', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.โคกปี่ฆ้อง', 'รพ.สต.โคกปี่ฆ้อง', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.โคกสัมพันธ์', 'รพ.สต.โคกสัมพันธ์', 'health_center', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองตะเคียน', 'รพ.สต.คลองตะเคียน', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ละลมติม', 'รพ.สต.ละลมติม', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองมั่ง', 'รพ.สต.หนองมั่ง', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองม่วง', 'รพ.สต.หนองม่วง', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองแวง', 'รพ.สต.หนองแวง', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.อ่างศิลา', 'รพ.สต.อ่างศิลา', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.โนนหมากมุ่น', 'รพ.สต.โนนหมากมุ่น', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ไผ่งาม', 'รพ.สต.ไผ่งาม', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.โคกสูง', 'รพ.สต.โคกสูง', 'health_center', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านคลองไก่เถื่อน', 'รพ.สต.บ้านคลองไก่เถื่อน', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านชุมทอง', 'รพ.สต.บ้านชุมทอง', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านทับทิมสยาม 05', 'รพ.สต.บ้านทับทิมสยาม 05', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านนาดี', 'รพ.สต.บ้านนาดี', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านน้ำคำ', 'รพ.สต.บ้านน้ำคำ', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านหนองแวง', 'รพ.สต.บ้านหนองแวง', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านหินกอง', 'รพ.สต.บ้านหินกอง', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านเขาตาง๊อก', 'รพ.สต.บ้านเขาตาง๊อก', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ราชันย์', 'รพ.สต.ราชันย์', 'health_center', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.กุดเกวียน', 'รพ.สต.กุดเกวียน', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ทับทิมสยาม 03', 'รพ.สต.ทับทิมสยาม 03', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ทัพเซียม', 'รพ.สต.ทัพเซียม', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ทัพไทย', 'รพ.สต.ทัพไทย', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.นวมินทราชินี', 'รพ.สต.นวมินทราชินี', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31');

INSERT INTO public.projects (title, unit_name, unit_type, district, province, start_date, end_date) VALUES
('โครงการก่อสร้าง รพ.สต.นางาม', 'รพ.สต.นางาม', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านโคกไพล', 'รพ.สต.บ้านโคกไพล', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.มะกอก', 'รพ.สต.มะกอก', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.รัตนะ', 'รพ.สต.รัตนะ', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองติม', 'รพ.สต.หนองติม', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองผักแว่น', 'รพ.สต.หนองผักแว่น', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.แสง์', 'รพ.สต.แสง์', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.โคกเพร็ก', 'รพ.สต.โคกเพร็ก', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.โคกแจง', 'รพ.สต.โคกแจง', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.โคคลาน', 'รพ.สต.โคคลาน', 'health_center', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองจระเข้', 'รพ.สต.คลองจระเข้', 'health_center', 'วังน้ำเย็น', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ตาหลังใน', 'รพ.สต.ตาหลังใน', 'health_center', 'วังน้ำเย็น', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ทุ่งมหาเจริญ', 'รพ.สต.ทุ่งมหาเจริญ', 'health_center', 'วังน้ำเย็น', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านคลองตะเคียนชัย', 'รพ.สต.บ้านคลองตะเคียนชัย', 'health_center', 'วังน้ำเย็น', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านท่าตาสี', 'รพ.สต.บ้านท่าตาสี', 'health_center', 'วังน้ำเย็น', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สอน.วังสมบูรณ์', 'สอน.วังสมบูรณ์', 'health_center', 'วังสมบูรณ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองเจริญสุข', 'รพ.สต.คลองเจริญสุข', 'health_center', 'วังสมบูรณ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ทุ่งกบินทร์', 'รพ.สต.ทุ่งกบินทร์', 'health_center', 'วังสมบูรณ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านซับสิงโต', 'รพ.สต.บ้านซับสิงโต', 'health_center', 'วังสมบูรณ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านวังใหม่', 'รพ.สต.บ้านวังใหม่', 'health_center', 'วังสมบูรณ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านถวายเฉลิมพระเกียรติฯ', 'รพ.สต.บ้านถวายเฉลิมพระเกียรติฯ', 'health_center', 'วังสมบูรณ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านคลองคันโท', 'รพ.สต.บ้านคลองคันโท', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านคลองทราย', 'รพ.สต.บ้านคลองทราย', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านคลองมะนาว', 'รพ.สต.บ้านคลองมะนาว', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านช่องกุ่ม', 'รพ.สต.บ้านช่องกุ่ม', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านซับนกแก้ว', 'รพ.สต.บ้านซับนกแก้ว', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านทับใหม่', 'รพ.สต.บ้านทับใหม่', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านท่าช้าง', 'รพ.สต.บ้านท่าช้าง', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านท่าเกวียน', 'รพ.สต.บ้านท่าเกวียน', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านบ่อนางชิง', 'รพ.สต.บ้านบ่อนางชิง', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านหนองตะเคียนบอน', 'รพ.สต.บ้านหนองตะเคียนบอน', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านหนองน้ำใส', 'รพ.สต.บ้านหนองน้ำใส', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านหนองหมากฝ้าย', 'รพ.สต.บ้านหนองหมากฝ้าย', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านหนองหอย', 'รพ.สต.บ้านหนองหอย', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านหนองเทา', 'รพ.สต.บ้านหนองเทา', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านหนองแวง', 'รพ.สต.บ้านหนองแวง', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านห้วยชัน', 'รพ.สต.บ้านห้วยชัน', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านห้วยเดื่อ', 'รพ.สต.บ้านห้วยเดื่อ', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านเขาพรมสุวรรณ', 'รพ.สต.บ้านเขาพรมสุวรรณ', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านแซร์ออ', 'รพ.สต.บ้านแซร์ออ', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านใหม่ศรีจำปา', 'รพ.สต.บ้านใหม่ศรีจำปา', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านห้วยโจด', 'รพ.สต.บ้านห้วยโจด', 'health_center', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองทับจันทร์', 'รพ.สต.คลองทับจันทร์', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.นิคมสร้างตนเองคลองน้ำใส', 'รพ.สต.นิคมสร้างตนเองคลองน้ำใส', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองหว้า', 'รพ.สต.คลองหว้า', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ทับพริก', 'รพ.สต.ทับพริก', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ท่าข้าม', 'รพ.สต.ท่าข้าม', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.คลองน้ำใส', 'รพ.สต.คลองน้ำใส', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านโรงเรียน', 'รพ.สต.บ้านโรงเรียน', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.บ้านใหม่หนองไทร', 'รพ.สต.บ้านใหม่หนองไทร', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31');

INSERT INTO public.projects (title, unit_name, unit_type, district, province, start_date, end_date) VALUES
('โครงการก่อสร้าง รพ.สต.ป่าไร่', 'รพ.สต.ป่าไร่', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ผ่านศึก', 'รพ.สต.ผ่านศึก', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ฟากห้วย', 'รพ.สต.ฟากห้วย', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.ภูน้ำเกลี้ยง', 'รพ.สต.ภูน้ำเกลี้ยง', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองปรือ', 'รพ.สต.หนองปรือ', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หนองสังข์', 'รพ.สต.หนองสังข์', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.หันทราย', 'รพ.สต.หันทราย', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.สต.เมืองไผ่', 'รพ.สต.เมืองไผ่', 'health_center', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพร.สระแก้ว', 'รพร.สระแก้ว', 'hospital', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.อรัญประเทศ', 'รพ.อรัญประเทศ', 'hospital', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.วังน้ำเย็น', 'รพ.วังน้ำเย็น', 'hospital', 'วังน้ำเย็น', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.วัฒนานคร', 'รพ.วัฒนานคร', 'hospital', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.เขาฉกรรจ์', 'รพ.เขาฉกรรจ์', 'hospital', 'เขาฉกรรจ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.คลองหาด', 'รพ.คลองหาด', 'hospital', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.โคกสูง', 'รพ.โคกสูง', 'hospital', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.ตาพระยา', 'รพ.ตาพระยา', 'hospital', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง รพ.วังสมบูรณ์', 'รพ.วังสมบูรณ์', 'hospital', 'วังสมบูรณ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.เมืองสระแก้ว', 'สสอ.เมืองสระแก้ว', 'sso', 'เมืองสระแก้ว', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.อรัญประเทศ', 'สสอ.อรัญประเทศ', 'sso', 'อรัญประเทศ', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.วังน้ำเย็น', 'สสอ.วังน้ำเย็น', 'sso', 'วังน้ำเย็น', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.วัฒนานคร', 'สสอ.วัฒนานคร', 'sso', 'วัฒนานคร', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.เขาฉกรรจ์', 'สสอ.เขาฉกรรจ์', 'sso', 'เขาฉกรรจ์', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.คลองหาด', 'สสอ.คลองหาด', 'sso', 'คลองหาด', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.โคกสูง', 'สสอ.โคกสูง', 'sso', 'โคกสูง', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.ตาพระยา', 'สสอ.ตาพระยา', 'sso', 'ตาพระยา', 'สระแก้ว', '2026-01-01', '2026-12-31'),
('โครงการก่อสร้าง สสอ.วังสมบูรณ์', 'สสอ.วังสมบูรณ์', 'sso', 'วังสมบูรณ์', 'สระแก้ว', '2026-01-01', '2026-12-31');


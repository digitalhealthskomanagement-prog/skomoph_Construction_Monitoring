
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

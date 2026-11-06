-- บันทึกประวัติการแก้ไขข้อมูล (audit log): ใครทำอะไร กับข้อมูลไหน เมื่อไร
-- เขียนได้จาก server (service role) เท่านั้น ผู้ใช้ทั่วไปอ่าน/เขียนตรงไม่ได้
-- การลบจะเก็บสำเนาข้อมูลเดิมไว้ใน details.before เพื่อใช้ตรวจสอบหรือกู้คืนด้วยมือ

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  action text NOT NULL,          -- create | update | delete | approve | role_change ...
  entity text NOT NULL,          -- project | phase | update | calendar_event | risk | unit | user ...
  entity_id text,
  project_id uuid,
  summary text,
  details jsonb
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_project_id_idx ON public.audit_log (project_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT ALL ON public.audit_log TO service_role;

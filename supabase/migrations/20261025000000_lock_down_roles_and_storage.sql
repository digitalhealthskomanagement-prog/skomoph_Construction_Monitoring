-- ปิดช่องโหว่ยกระดับสิทธิ์ และจำกัดการเขียนข้อมูลให้ทำผ่าน server (service role) เท่านั้น
-- ทุก server function ใช้ supabaseAdmin (service role) ซึ่ง bypass RLS อยู่แล้ว
-- ส่วน client ใช้ anon/authenticated อ่านข้อมูลสาธารณะอย่างเดียว

-- ==========================================
-- 1. user_roles: ห้ามผู้ใช้เขียนหรืออ่านตารางสิทธิ์โดยตรง
-- ==========================================
-- เดิมผู้ใช้ที่ล็อกอินแล้ว INSERT แถว role = 'super_admin' ให้ตัวเองผ่าน REST API ได้
DROP POLICY IF EXISTS "users can insert their own role on registration" ON public.user_roles;
-- policy นี้ query user_roles ซ้อนตัวเอง (recursive) และไม่จำเป็นอีกต่อไป
DROP POLICY IF EXISTS "super_admins can manage all roles" ON public.user_roles;
-- เดิมเปิดให้ anon อ่านรายชื่อ user id + role ของทุกคน
DROP POLICY IF EXISTS "public read user_roles" ON public.user_roles;

REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. units: อ่านได้สาธารณะ แต่เขียนผ่าน server เท่านั้น
-- ==========================================
-- policy เดิมอ้างอิง user_roles ซึ่งตอนนี้ client อ่านไม่ได้แล้ว
DROP POLICY IF EXISTS "Super admins can manage units" ON public.units;
DROP POLICY IF EXISTS "Unit admins can update their units" ON public.units;

-- ==========================================
-- 3. ตารางข้อมูลโครงการ: ถอนสิทธิ์เขียนจาก client (defense in depth)
-- ==========================================
-- Supabase ให้ default privileges ALL แก่ anon/authenticated บนตารางใหม่ใน public
-- ตอนนี้มีแค่ policy SELECT จึงยังเขียนไม่ได้ แต่ถอนไว้กันพลาดถ้ามีคนเพิ่ม policy ในอนาคต
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
  public.units,
  public.projects,
  public.phases,
  public.calendar_events,
  public.updates,
  public.risks,
  public.resource_links
FROM anon, authenticated;

-- ==========================================
-- 4. Storage: อ่านได้สาธารณะ ห้าม client อัปโหลด/แก้/ลบเอง
-- ==========================================
-- การอัปโหลดทำผ่าน signed upload URL ที่ server ออกให้ (createSignedUploadUrl)
-- ซึ่งไม่ต้องพึ่ง policy INSERT ของ authenticated
DROP POLICY IF EXISTS "Auth Insert Updates" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Updates" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Updates" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert Settings" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Settings" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Settings" ON storage.objects;

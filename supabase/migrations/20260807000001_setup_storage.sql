-- สร้าง Bucket "updates" สำหรับเก็บรูปภาพความคืบหน้าของโครงการก่อสร้าง
INSERT INTO storage.buckets (id, name, public) 
VALUES ('updates', 'updates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- สร้าง Bucket "settings" สำหรับเก็บรูปหน้าปกหรือโลโก้ของหน่วยบริการ
INSERT INTO storage.buckets (id, name, public) 
VALUES ('settings', 'settings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ==========================================
-- สร้างนโยบายความปลอดภัย (RLS) สำหรับ "updates"
-- ==========================================
-- 1. อนุญาตให้ทุกคนเข้าไปอ่านรูปได้ (Public Read)
CREATE POLICY "Public Access Updates" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'updates');

-- 2. อนุญาตให้คนล็อกอินอัปโหลด ลบ แก้ไข รูปได้
CREATE POLICY "Auth Insert Updates" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'updates');

CREATE POLICY "Auth Update Updates" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'updates');

CREATE POLICY "Auth Delete Updates" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'updates');


-- ==========================================
-- สร้างนโยบายความปลอดภัย (RLS) สำหรับ "settings"
-- ==========================================
-- 1. อนุญาตให้ทุกคนเข้าไปอ่านรูปได้ (Public Read)
CREATE POLICY "Public Access Settings" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'settings');

-- 2. อนุญาตให้คนล็อกอินอัปโหลด ลบ แก้ไข รูปได้
CREATE POLICY "Auth Insert Settings" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'settings');

CREATE POLICY "Auth Update Settings" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'settings');

CREATE POLICY "Auth Delete Settings" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'settings');

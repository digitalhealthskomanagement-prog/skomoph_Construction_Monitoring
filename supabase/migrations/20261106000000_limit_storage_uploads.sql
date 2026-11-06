-- จำกัดขนาดและชนิดไฟล์ที่อัปโหลดเข้า bucket รูปภาพ
-- เดิมไม่มีขีดจำกัด ผู้ที่ได้ signed upload URL จึงอัปโหลดไฟล์ขนาดใดก็ได้ และกำหนด
-- content-type เป็นอะไรก็ได้ (เช่น text/html หรือ image/svg+xml ในชื่อไฟล์ .jpg)
-- หน้าเว็บบีบอัดรูปให้ต่ำกว่า 1.5MB ก่อนอัปโหลดอยู่แล้ว จึงตั้งเพดานไว้ที่ 5MB

UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png']
WHERE id IN ('updates', 'settings');

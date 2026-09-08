-- ==============================================================================
-- Seed Data: Sample Hospital Project (ต้นแบบเดิมจาก รพ.สรรคบุรี จ.ชัยนาท)
-- สำหรับใช้เป็นข้อมูลตัวอย่างในการทดสอบ หรือเป็นแม่แบบของโครงการก่อสร้าง
-- ==============================================================================

-- 1. ตัวอย่างโครงการก่อสร้าง
INSERT INTO public.projects (
    id, 
    title, 
    subtitle, 
    budget_baht, 
    budget_source, 
    total_progress, 
    start_date, 
    end_date, 
    is_active
)
VALUES (
    'b7e842b7-f646-4d47-8f82-829a862b3a3f', 
    'โครงการก่อสร้างสำนักงานสาธารณสุขจังหวัดสระแก้ว', 
    'โครงการปรับปรุงและก่อสร้างพื้นที่ส่วนกลาง', 
    25000000, 
    'เงินงบประมาณ', 
    45, 
    '2026-01-01', 
    '2026-12-31', 
    true
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    budget_baht = EXCLUDED.budget_baht,
    budget_source = EXCLUDED.budget_source,
    total_progress = EXCLUDED.total_progress;

-- 2. ตัวอย่างงวดงาน (Phases)
INSERT INTO public.phases (project_id, name, category, "order", weight, progress, color)
VALUES
    ('b7e842b7-f646-4d47-8f82-829a862b3a3f', 'จัดทำ TOR และประกาศจัดซื้อจัดจ้าง', 'preparation', 1, 10, 100, '#3b82f6'),
    ('b7e842b7-f646-4d47-8f82-829a862b3a3f', 'ลงนามในสัญญาจ้างและเตรียมพื้นที่', 'preparation', 2, 10, 100, '#3b82f6'),
    ('b7e842b7-f646-4d47-8f82-829a862b3a3f', 'งวดที่ 1: งานฐานรากและเสาเข็ม', 'construction', 3, 20, 100, '#10b981'),
    ('b7e842b7-f646-4d47-8f82-829a862b3a3f', 'งวดที่ 2: งานโครงสร้างชั้น 1-2', 'construction', 4, 30, 25, '#10b981'),
    ('b7e842b7-f646-4d47-8f82-829a862b3a3f', 'งวดที่ 3: งานสถาปัตยกรรมและตกแต่ง', 'construction', 5, 20, 0, '#f59e0b'),
    ('b7e842b7-f646-4d47-8f82-829a862b3a3f', 'งวดที่ 4: งานระบบสุขาภิบาลและไฟฟ้า', 'construction', 6, 10, 0, '#f59e0b')
ON CONFLICT DO NOTHING;

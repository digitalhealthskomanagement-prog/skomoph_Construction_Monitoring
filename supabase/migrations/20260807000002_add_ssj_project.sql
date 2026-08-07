-- 20260807000002_add_ssj_project.sql

-- Add SSJ Project to the database
INSERT INTO public.projects (id, title, subtitle, unit_name, unit_type, district, province, start_date, end_date)
VALUES (
    'b7e842b7-f646-4d47-8f82-829a862b3a3f', 
    'โครงการก่อสร้างสำนักงานสาธารณสุขจังหวัดสระแก้ว', 
    'โครงการปรับปรุงและก่อสร้างพื้นที่ส่วนกลาง', 
    'สำนักงานสาธารณสุขจังหวัดสระแก้ว', 
    'สสจ.', 
    'เมืองสระแก้ว', 
    'สระแก้ว',
    '2026-01-01',
    '2026-12-31'
)
ON CONFLICT (id) DO NOTHING;

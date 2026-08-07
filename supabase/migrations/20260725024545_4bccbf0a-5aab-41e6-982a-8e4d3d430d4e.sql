
CREATE POLICY "public read updates images" ON storage.objects
  FOR SELECT USING (bucket_id = 'updates');

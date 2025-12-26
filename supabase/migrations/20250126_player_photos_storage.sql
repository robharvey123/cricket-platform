-- Storage bucket for player photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads for player photos
DROP POLICY IF EXISTS player_photos_read ON storage.objects;
CREATE POLICY player_photos_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'player-photos');

-- Allow users to manage their own uploads (path prefixed with auth.uid())
DROP POLICY IF EXISTS player_photos_insert ON storage.objects;
CREATE POLICY player_photos_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'player-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS player_photos_update ON storage.objects;
CREATE POLICY player_photos_update
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'player-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'player-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS player_photos_delete ON storage.objects;
CREATE POLICY player_photos_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'player-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

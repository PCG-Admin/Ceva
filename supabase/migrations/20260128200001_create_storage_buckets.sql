-- Migration: Create Storage Buckets
-- Description: Storage bucket for transporter documents (bank proofs, VAT certificates, GIT confirmations)

-- ============================================
-- CREATE STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'transporter-documents',
    'transporter-documents',
    FALSE, -- Private bucket
    10485760, -- 10MB max file size
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload transporter documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view transporter documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update transporter documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete transporter documents" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload transporter documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'transporter-documents'
);

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view transporter documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'transporter-documents'
);

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Authenticated users can update transporter documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'transporter-documents'
);

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete transporter documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'transporter-documents'
);

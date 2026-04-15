
-- Create portfolio_photos table
CREATE TABLE public.portfolio_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  file_name TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;

-- Own photos: full access
CREATE POLICY "portfolio_own" ON public.portfolio_photos
  FOR ALL USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Anyone can view (public profile)
CREATE POLICY "portfolio_read_all" ON public.portfolio_photos
  FOR SELECT USING (true);

-- Create storage bucket for portfolio
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);

-- Storage policies for portfolio bucket
CREATE POLICY "portfolio_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "portfolio_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "portfolio_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio');

-- =========================================================================
-- SUPABASE SCHEMA FOR AI KISAN MITRA (AGRICULTURUAL COMPANION)
-- Copy and paste this script directly into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/zxirdlcuejjufsfxhmtq/sql)
-- =========================================================================

-- Enable uuid-ossp extension for generating unique UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES / USERS TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    language VARCHAR(5) DEFAULT 'pa' NOT NULL,
    role VARCHAR(20) DEFAULT 'farmer' NOT NULL CHECK (role IN ('farmer', 'officer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Allow public read access to profiles" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Allow system/auth to insert profiles" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);


-- 2. CROP DISEASE REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.disease_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,
    image_url TEXT NOT NULL,
    disease_name TEXT NOT NULL,
    confidence NUMERIC(4, 2) NOT NULL,
    causes TEXT NOT NULL,
    symptoms TEXT[] NOT NULL DEFAULT '{}',
    prevention TEXT NOT NULL,
    treatment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on disease reports
ALTER TABLE public.disease_reports ENABLE ROW LEVEL SECURITY;

-- Disease Reports RLS Policies
CREATE POLICY "Users can read their own disease reports" 
    ON public.disease_reports FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create disease reports" 
    ON public.disease_reports FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- 3. SOIL REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.soil_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    crop TEXT NOT NULL,
    nitrogen INTEGER NOT NULL,
    phosphorus INTEGER NOT NULL,
    potassium INTEGER NOT NULL,
    soil_type TEXT NOT NULL,
    ph NUMERIC(3, 1) NOT NULL,
    analysis TEXT NOT NULL,
    fertilizer_recommendation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on soil reports
ALTER TABLE public.soil_reports ENABLE ROW LEVEL SECURITY;

-- Soil Reports RLS Policies
CREATE POLICY "Users can read their own soil reports" 
    ON public.soil_reports FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own soil reports" 
    ON public.soil_reports FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- 4. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
    language VARCHAR(5) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on chat messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat RLS Policies
CREATE POLICY "Users can read their own chat history" 
    ON public.chat_messages FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can post chat messages" 
    ON public.chat_messages FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- 5. PEST ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.pest_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reporter_name TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    pest_name TEXT NOT NULL,
    severity VARCHAR(15) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on pest alerts
ALTER TABLE public.pest_alerts ENABLE ROW LEVEL SECURITY;

-- Pest Alerts RLS Policies
CREATE POLICY "Anyone can look at pest alerts" 
    ON public.pest_alerts FOR SELECT 
    USING (true);

CREATE POLICY "Users can publish pest alerts" 
    ON public.pest_alerts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- UUID or 'all'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(15) NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notifications (Officers edit, users select)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow selection of notifications" 
    ON public.notifications FOR SELECT 
    USING (true);

-- =========================================================================
-- AUTOMATED PROFILE CREATION TRIGGER
-- Whenever a user signs up (e.g., via OAuth/Google or Email), Supabase
-- will automatically initialize a record inside public.profiles!
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, language, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        'pa',
        'farmer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

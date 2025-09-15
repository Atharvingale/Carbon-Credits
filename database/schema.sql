-- Carbon Credits Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    full_name TEXT,
    organization_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create projects table for carbon credit projects
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    project_type TEXT NOT NULL,
    area DECIMAL,
    estimated_credits INTEGER,
    submitted_by TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    mint_address TEXT, -- Solana mint address for this project
    submitted_by_user UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tokens table for tracking minted tokens
CREATE TABLE public.tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mint TEXT NOT NULL, -- Solana mint address
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL, -- Recipient wallet address
    amount BIGINT NOT NULL,
    minted_tx TEXT NOT NULL, -- Solana transaction signature
    minted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_submitted_by_user ON public.projects(submitted_by_user);
CREATE INDEX idx_projects_mint_address ON public.projects(mint_address);
CREATE INDEX idx_tokens_mint ON public.tokens(mint);
CREATE INDEX idx_tokens_project_id ON public.tokens(project_id);
CREATE INDEX idx_tokens_recipient ON public.tokens(recipient);

-- Create a function to automatically update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for projects table
CREATE POLICY "Anyone can view approved projects" ON public.projects
    FOR SELECT USING (status = 'approved' OR status = 'completed');

CREATE POLICY "Users can view own submitted projects" ON public.projects
    FOR SELECT USING (submitted_by_user = auth.uid());

CREATE POLICY "Users can insert projects" ON public.projects
    FOR INSERT WITH CHECK (submitted_by_user = auth.uid());

CREATE POLICY "Users can update own pending projects" ON public.projects
    FOR UPDATE USING (
        submitted_by_user = auth.uid() AND status = 'pending'
    );

CREATE POLICY "Admins can view all projects" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all projects" ON public.projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for tokens table
CREATE POLICY "Users can view tokens for their wallet" ON public.tokens
    FOR SELECT USING (
        recipient IN (
            SELECT wallet_address FROM public.projects 
            WHERE submitted_by_user = auth.uid()
        )
    );

CREATE POLICY "Admins can view all tokens" ON public.tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert tokens" ON public.tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create a function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'user');
    RETURN new;
END;
$$ language plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert a default admin user (you'll need to update this with your actual admin email)
-- IMPORTANT: Change 'admin@example.com' to your actual admin email
-- You'll need to sign up with this email first, then run this update
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';

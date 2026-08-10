-- ========================================================
-- HI-TECH AIR TECHNOLOGY - SUPABASE DATABASE INITIALIZATION
-- Copy and paste this script into Supabase SQL Editor and click RUN
-- ========================================================

-- 1. Create Profiles Table (Stores user roles: Sales, Engineer, Owner)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('Sales', 'Engineer', 'Owner')) DEFAULT 'Sales',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Automatic trigger function to insert profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Sales')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  interested_product TEXT,
  requirement TEXT,
  status TEXT DEFAULT 'New',
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  purchased_product TEXT,
  installation_date DATE,
  assigned_engineer TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Services Table
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  service_name TEXT,
  scheduled_date DATE,
  status TEXT DEFAULT 'Upcoming',
  assigned_engineer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Future Opportunities Table (Owner Vault)
CREATE TABLE IF NOT EXISTS public.future_opportunities (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  requirement TEXT,
  expected_purchase_month TEXT,
  reminder_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS & Allow Access Policies for Tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public leads access" ON public.leads FOR ALL USING (true);
CREATE POLICY "Public customers access" ON public.customers FOR ALL USING (true);
CREATE POLICY "Public services access" ON public.services FOR ALL USING (true);
CREATE POLICY "Public future_opportunities access" ON public.future_opportunities FOR ALL USING (true);

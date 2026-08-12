-- ========================================================
-- HI-TECH AIR CORPORATION - SUPABASE / POSTGRESQL INITIALIZATION
-- Copy and paste this entire script into Supabase SQL Editor and click RUN
-- ========================================================

-- 1. Create Profiles Table (Stores User Accounts & Roles: Admin, Sales, Engineer)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('Sales', 'Engineer', 'Owner', 'Admin')) DEFAULT 'Sales',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Safe Policy Definitions (Drop if exists first to avoid 42710 policy already exists error)
DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.profiles;
CREATE POLICY "Allow public read access on profiles"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Automatic trigger function to insert profile when a new user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Sales')
  )
  ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name, role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Create Leads Table (Sales Team Lead Logging with Sales Representative Attribution)
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  interested_product TEXT,
  requirement TEXT NOT NULL,
  status TEXT DEFAULT 'New',
  follow_up_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  sales_person_id TEXT,
  sales_person_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sales_person_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sales_person_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;


-- 3. Create Future Opportunities Table (Client Deferred Future Requirements)
CREATE TABLE IF NOT EXISTS public.future_opportunities (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  requirement TEXT NOT NULL,
  expected_purchase_month TEXT NOT NULL,
  reminder_date DATE NOT NULL,
  notes TEXT,
  sales_person_id TEXT,
  sales_person_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.future_opportunities ADD COLUMN IF NOT EXISTS sales_person_id TEXT;
ALTER TABLE public.future_opportunities ADD COLUMN IF NOT EXISTS sales_person_name TEXT;
ALTER TABLE public.future_opportunities ADD COLUMN IF NOT EXISTS notes TEXT;


-- 4. Create Customers Table (Purchased Items & Services Record)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  purchased_product TEXT NOT NULL,
  installation_date DATE DEFAULT CURRENT_DATE,
  assigned_engineer TEXT,
  address TEXT,
  sales_person_id TEXT,
  sales_person_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS sales_person_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS sales_person_name TEXT;


-- 5. Create Services Table (Auto-Generated Maintenance Reminders for Field Engineers: 2m, 6m, 10m)
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  company TEXT,
  product TEXT,
  service_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  assigned_engineer TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS notes TEXT;


-- Enable Row Level Security (RLS) & Safe Public Policies for Application Operations
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public leads access" ON public.leads;
CREATE POLICY "Public leads access" ON public.leads FOR ALL USING (true);

DROP POLICY IF EXISTS "Public future_opportunities access" ON public.future_opportunities;
CREATE POLICY "Public future_opportunities access" ON public.future_opportunities FOR ALL USING (true);

DROP POLICY IF EXISTS "Public customers access" ON public.customers;
CREATE POLICY "Public customers access" ON public.customers FOR ALL USING (true);

DROP POLICY IF EXISTS "Public services access" ON public.services;
CREATE POLICY "Public services access" ON public.services FOR ALL USING (true);

-- Indexes for Fast Search & Filtering by Sales Representative
CREATE INDEX IF NOT EXISTS idx_leads_sales_person ON public.leads(sales_person_name);
CREATE INDEX IF NOT EXISTS idx_future_opps_sales_person ON public.future_opportunities(sales_person_name);
CREATE INDEX IF NOT EXISTS idx_services_engineer ON public.services(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_services_date ON public.services(scheduled_date);





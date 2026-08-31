-- ========================================================
-- HI-TECH AIR CORPORATION - SUPABASE / POSTGRESQL INITIALIZATION & SCHEMA MIGRATION
-- Copy and paste this entire script into your Supabase SQL Editor and click RUN
-- ========================================================

-- 1. Profiles Table (User Accounts, Roles & Assigned Branch: Surat, Morbi, Rajkot)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('Sales', 'Engineer', 'Owner', 'Admin')) DEFAULT 'Sales',
  branch TEXT CHECK (branch IN ('Surat', 'Morbi', 'Rajkot')) DEFAULT 'Surat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Surat';

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.profiles;
CREATE POLICY "Allow public read access on profiles"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Automatic trigger function to insert/update profile when a new user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, branch)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Sales'),
    COALESCE(NEW.raw_user_meta_data->>'branch', 'Surat')
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    name = EXCLUDED.name, 
    role = EXCLUDED.role,
    branch = EXCLUDED.branch;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Leads Table (Sales Team Lead Logging with Branch, Hot/Cold Lead Classification & Loss Reason)
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  branch TEXT DEFAULT 'Surat',
  lead_type TEXT DEFAULT 'Hot Lead',
  interested_product TEXT,
  requirement TEXT NOT NULL,
  status TEXT DEFAULT 'New',
  loss_reason TEXT,
  loss_remark TEXT,
  loss_date DATE,
  follow_up_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  sales_person_id TEXT,
  sales_person_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all lead columns exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Surat';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'Hot Lead';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_remark TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sales_person_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sales_person_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;


-- 3. Future Opportunities Table (Client Deferred Future Requirements)
CREATE TABLE IF NOT EXISTS public.future_opportunities (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  branch TEXT DEFAULT 'Surat',
  requirement TEXT NOT NULL,
  expected_purchase_month TEXT NOT NULL,
  reminder_date DATE NOT NULL,
  notes TEXT,
  sales_person_id TEXT,
  sales_person_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.future_opportunities ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Surat';
ALTER TABLE public.future_opportunities ADD COLUMN IF NOT EXISTS sales_person_id TEXT;
ALTER TABLE public.future_opportunities ADD COLUMN IF NOT EXISTS sales_person_name TEXT;
ALTER TABLE public.future_opportunities ADD COLUMN IF NOT EXISTS notes TEXT;


-- 4. Customers Table (Purchased Items, Installation, Branch & Service Assignment)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  branch TEXT DEFAULT 'Surat',
  purchased_product TEXT NOT NULL,
  installation_date DATE DEFAULT CURRENT_DATE,
  assigned_engineer TEXT,
  address TEXT,
  sales_person_id TEXT,
  sales_person_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Surat';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS sales_person_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS sales_person_name TEXT;


-- 5. Services Table (Engineer Service Reports, Work Done, Parts Replaced & Next Scheduled Service Date)
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  company TEXT,
  branch TEXT DEFAULT 'Surat',
  product TEXT,
  service_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  assigned_engineer TEXT,
  work_done TEXT,
  parts_replaced TEXT,
  completion_date DATE,
  next_service_date DATE,
  engineer_notes TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Surat';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS work_done TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS parts_replaced TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS next_service_date DATE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS engineer_notes TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS notes TEXT;


-- 6. Stock Items Table (Branch-Wise Inventory: Surat, Morbi, Rajkot with 1-Year Consumption Tracking)
CREATE TABLE IF NOT EXISTS public.stock_items (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Spare Part', -- 'Machine' (Sales) | 'Spare Part' (Service)
  part_number TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'Surat', -- 'Surat' | 'Morbi' | 'Rajkot'
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Units',
  min_alert_level NUMERIC NOT NULL DEFAULT 5,
  annual_consumption NUMERIC NOT NULL DEFAULT 0, -- 1-Year consumption rate
  unit_price NUMERIC DEFAULT 0,
  compatible_models TEXT,
  last_restocked_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all stock columns exist
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Surat';
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS annual_consumption NUMERIC DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS compatible_models TEXT;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS last_restocked_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS notes TEXT;


-- Enable Row Level Security (RLS) & Safe Public Policies
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public leads access" ON public.leads;
CREATE POLICY "Public leads access" ON public.leads FOR ALL USING (true);

DROP POLICY IF EXISTS "Public future_opportunities access" ON public.future_opportunities;
CREATE POLICY "Public future_opportunities access" ON public.future_opportunities FOR ALL USING (true);

DROP POLICY IF EXISTS "Public customers access" ON public.customers;
CREATE POLICY "Public customers access" ON public.customers FOR ALL USING (true);

DROP POLICY IF EXISTS "Public services access" ON public.services;
CREATE POLICY "Public services access" ON public.services FOR ALL USING (true);

DROP POLICY IF EXISTS "Public stock_items access" ON public.stock_items;
CREATE POLICY "Public stock_items access" ON public.stock_items FOR ALL USING (true);


-- Indexes for High Performance Querying & Branch Filtering
CREATE INDEX IF NOT EXISTS idx_leads_branch ON public.leads(branch);
CREATE INDEX IF NOT EXISTS idx_leads_sales_person ON public.leads(sales_person_name);
CREATE INDEX IF NOT EXISTS idx_future_opps_branch ON public.future_opportunities(branch);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON public.customers(branch);
CREATE INDEX IF NOT EXISTS idx_services_branch ON public.services(branch);
CREATE INDEX IF NOT EXISTS idx_services_engineer ON public.services(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_services_date ON public.services(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_stock_branch ON public.stock_items(branch);
CREATE INDEX IF NOT EXISTS idx_stock_category ON public.stock_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_part_number ON public.stock_items(part_number);


-- 7. Seed Initial Branch Stock Items (Surat, Morbi, Rajkot)
INSERT INTO public.stock_items (id, item_name, category, part_number, branch, quantity, unit, min_alert_level, annual_consumption, unit_price, compatible_models, notes)
VALUES
  -- Surat Branch
  ('STK-SRT-01', '50 HP Screw Air Compressor (Direct Drive)', 'Machine', 'HT-CMP-50HP-DD', 'Surat', 4, 'Units', 2, 24, 420000, 'Standard 50 HP Industrial Series', 'High demand textile & diamond processing units'),
  ('STK-SRT-02', '75 HP VFD Screw Compressor (Energy Saver)', 'Machine', 'HT-CMP-75HP-VFD', 'Surat', 3, 'Units', 2, 18, 650000, 'VFD Series Plant Installations', 'Variable speed drive for heavy power saving'),
  ('STK-SRT-03', 'Air Filter Cartridge 50 HP (Nano Fiber)', 'Spare Part', 'HT-AF-50HP-NF', 'Surat', 28, 'Units', 10, 140, 2800, '50 HP & 60 HP Screw Compressors', 'Fast moving consumable, replaced every 2000 hours'),
  ('STK-SRT-04', 'Spin-On Oil Filter 50/75 HP', 'Spare Part', 'HT-OF-75HP-SO', 'Surat', 22, 'Units', 8, 120, 1950, '50 HP, 75 HP, 100 HP Models', 'Routine service replacement item'),
  ('STK-SRT-05', 'Synthetic Compressor Lubricant (ISO VG 46 - 20L)', 'Spare Part', 'HT-OIL-VG46-20L', 'Surat', 15, 'Pails (20L)', 6, 95, 7800, 'All Hi-Tech Rotary Screw Series', '8000-Hour long life synthetic oil'),
  ('STK-SRT-06', 'Air-Oil Separator Element 75 HP', 'Spare Part', 'HT-SEP-75HP-FL', 'Surat', 6, 'Units', 4, 36, 8500, '75 HP VFD & Direct Drive Series', 'Residual oil content < 3 ppm'),

  -- Morbi Branch
  ('STK-MRB-01', '100 HP Heavy-Duty Screw Air Compressor', 'Machine', 'HT-CMP-100HP-HD', 'Morbi', 2, 'Units', 1, 16, 890000, 'Ceramic & Heavy Vitrified Tile Plants', 'Ceramic cluster standard heavy unit'),
  ('STK-MRB-02', '10-Ton Industrial Water Chiller', 'Machine', 'HT-CHL-10TON', 'Morbi', 3, 'Units', 1, 12, 380000, 'Ceramic Roller & Glaze Line Cooling', 'Heavy duty scroll compressor chiller'),
  ('STK-MRB-03', 'Air Filter Cartridge 100 HP Heavy Dust', 'Spare Part', 'HT-AF-100HP-HD', 'Morbi', 35, 'Units', 12, 190, 4200, '100 HP & 120 HP Screw Compressors', 'Critical high-dust ceramic zone intake filter'),
  ('STK-MRB-04', 'Refrigerated Air Dryer 150 CFM', 'Machine', 'HT-DRY-150CFM', 'Morbi', 4, 'Units', 2, 22, 145000, 'Moisture removal for ceramic glazing lines', '+3°C pressure dew point dryer'),
  ('STK-MRB-05', 'Drive Belt Set (SPB 2240 - High Torque)', 'Spare Part', 'HT-BLT-SPB2240', 'Morbi', 18, 'Sets', 6, 75, 3200, '50 HP & 75 HP Belt Driven Compressors', 'Oil & heat resistant cogged raw edge belts'),

  -- Rajkot Branch
  ('STK-RJK-01', '30 HP Compact Rotary Screw Compressor', 'Machine', 'HT-CMP-30HP-CP', 'Rajkot', 5, 'Units', 2, 28, 295000, 'CNC Machine Shops & Forging Units', 'Popular in Rajkot engineering and auto-parts hub'),
  ('STK-RJK-02', 'Refrigerated Air Dryer 100 CFM', 'Machine', 'HT-DRY-100CFM', 'Rajkot', 3, 'Units', 2, 20, 98000, '30 HP & 50 HP CNC workshop lines', 'Ensures moisture-free pneumatic tooling'),
  ('STK-RJK-03', 'Air Filter Cartridge 30 HP Compact', 'Spare Part', 'HT-AF-30HP-CP', 'Rajkot', 24, 'Units', 8, 110, 2200, '30 HP Compact Series', 'Fast moving consumable in Rajkot machine tooling'),
  ('STK-RJK-04', 'Thermostatic Valve Element (71°C)', 'Spare Part', 'HT-THV-71C', 'Rajkot', 8, 'Units', 3, 32, 4500, 'All Oil Injected Screw Compressors', 'Oil temperature regulation valve'),
  ('STK-RJK-05', 'Minimum Pressure Valve (MPV) Kit', 'Spare Part', 'HT-MPV-KIT-50', 'Rajkot', 5, 'Kits', 3, 26, 5800, '50 HP Discharge Line Valves', 'Includes internal seals and return spring')
ON CONFLICT (id) DO UPDATE
SET 
  item_name = EXCLUDED.item_name,
  category = EXCLUDED.category,
  part_number = EXCLUDED.part_number,
  branch = EXCLUDED.branch,
  quantity = EXCLUDED.quantity,
  unit = EXCLUDED.unit,
  min_alert_level = EXCLUDED.min_alert_level,
  annual_consumption = EXCLUDED.annual_consumption,
  unit_price = EXCLUDED.unit_price,
  compatible_models = EXCLUDED.compatible_models,
  notes = EXCLUDED.notes;

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
  can_view_stock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Surat';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_view_stock BOOLEAN DEFAULT false;

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.profiles;
CREATE POLICY "Allow public read access on profiles"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update access on profiles" ON public.profiles;
CREATE POLICY "Allow public update access on profiles"
  ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert access on profiles" ON public.profiles;
CREATE POLICY "Allow public insert access on profiles"
  ON public.profiles FOR INSERT WITH CHECK (true);

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
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Machine';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 1;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS serial_number TEXT;
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


-- 7. Seed Initial Branch Stock Items with Official PDF Brochure Catalog (Surat, Morbi, Rajkot)
INSERT INTO public.stock_items (id, item_name, category, part_number, branch, quantity, unit, min_alert_level, annual_consumption, unit_price, compatible_models, notes)
VALUES
  -- Single Stage Rotary Screw Compressors (PDF Page 4)
  ('STK-HAT-04-SRT', 'HAT 4 - 5 HP (4 kW) Rotary Screw Compressor', 'Machine', 'HAT 4', 'Surat', 4, 'Units', 2, 20, 185000, 'HAT 4 (5 HP / 4 kW) Single Stage', 'Power: 4 kW (5 HP) | FAD: 23/20/18 CFM @ 7/8/10 BAR | Noise: 57 dB(A) | Dim: 85x62x98 cm | Wt: 210 kg | Outlet: G 1/2"'),
  ('STK-HAT-07-SRT', 'HAT 7 - 10 HP (7.5 kW) Rotary Screw Compressor', 'Machine', 'HAT 7', 'Surat', 5, 'Units', 2, 25, 245000, 'HAT 7 (10 HP / 7.5 kW) Single Stage', 'Power: 7.5 kW (10 HP) | FAD: 43/39/32 CFM @ 7/8/10 BAR | Noise: 61 dB(A) | Dim: 95x67x103 cm | Wt: 250 kg | Outlet: G 1/2"'),
  ('STK-HAT-11-SRT', 'HAT 11 - 15 HP (11 kW) Rotary Screw Compressor', 'Machine', 'HAT 11', 'Surat', 4, 'Units', 2, 22, 295000, 'HAT 11 (15 HP / 11 kW) Single Stage', 'Power: 11 kW (15 HP) | FAD: 62/54/47 CFM @ 7/8/10 BAR | Noise: 63 dB(A) | Dim: 115x82x103 cm | Wt: 400 kg | Outlet: G 3/4"'),
  ('STK-HAT-15-MRB', 'HAT 15 - 20 HP (15 kW) Rotary Screw Compressor', 'Machine', 'HAT 15', 'Morbi', 4, 'Units', 2, 18, 340000, 'HAT 15 (20 HP / 15 kW) Single Stage', 'Power: 15 kW (20 HP) | FAD: 90/83/77 CFM @ 7/8/10 BAR | Noise: 65 dB(A) | Dim: 115x82x103 cm | Wt: 400 kg | Outlet: G 3/4"'),
  ('STK-HAT-18-MRB', 'HAT 18 - 25 HP (18.5 kW) Rotary Screw Compressor', 'Machine', 'HAT 18', 'Morbi', 3, 'Units', 2, 20, 395000, 'HAT 18 (25 HP / 18.5 kW) Single Stage', 'Power: 18.5 kW (25 HP) | FAD: 119/108/97 CFM @ 7/8/10 BAR | Noise: 67 dB(A) | Dim: 135x92x123 cm | Wt: 550 kg | Outlet: G 1"'),
  ('STK-HAT-22-RJK', 'HAT 22 - 30 HP (22 kW) Rotary Screw Compressor', 'Machine', 'HAT 22', 'Rajkot', 5, 'Units', 2, 28, 445000, 'HAT 22 (30 HP / 22 kW) Single Stage', 'Power: 22 kW (30 HP) | FAD: 135/129/114 CFM @ 7/8/10 BAR | Noise: 67 dB(A) | Dim: 135x92x123 cm | Wt: 550 kg | Outlet: G 1"'),
  ('STK-HAT-30-RJK', 'HAT 30 - 40 HP (30 kW) Rotary Screw Compressor', 'Machine', 'HAT 30', 'Rajkot', 3, 'Units', 1, 16, 520000, 'HAT 30 (40 HP / 30 kW) Single Stage', 'Power: 30 kW (40 HP) | FAD: 185/179/163 CFM @ 7/8/10 BAR | Noise: 70 dB(A) | Dim: 150x102x131 cm | Wt: 700 kg | Outlet: G-1 1/2"'),
  ('STK-HAT-37-SRT', 'HAT 37 - 50 HP (37 kW) Rotary Screw Compressor', 'Machine', 'HAT 37', 'Surat', 4, 'Units', 2, 24, 590000, 'HAT 37 (50 HP / 37 kW) Single Stage', 'Power: 37 kW (50 HP) | FAD: 239/220/203 CFM @ 7/8/10 BAR | Noise: 71 dB(A) | Dim: 150x102x131 cm | Wt: 750 kg | Outlet: G-1 1/2"'),
  ('STK-HAT-45-MRB', 'HAT 45 - 60 HP (45 kW) Rotary Screw Compressor', 'Machine', 'HAT 45', 'Morbi', 3, 'Units', 1, 15, 680000, 'HAT 45 (60 HP / 45 kW) Single Stage', 'Power: 45 kW (60 HP) | FAD: 286/248/225 CFM @ 7/8/10 BAR | Noise: 73 dB(A) | Dim: 150x102x131 cm | Wt: 800 kg | Outlet: G 2"'),
  ('STK-HAT-55-SRT', 'HAT 55 - 75 HP (55 kW) Rotary Screw Compressor', 'Machine', 'HAT 55', 'Surat', 3, 'Units', 1, 14, 820000, 'HAT 55 (75 HP / 55 kW) Single Stage', 'Power: 55 kW (75 HP) | FAD: 365/325/301 CFM @ 7/8/10 BAR | Noise: 76 dB(A) | Dim: 190x126x160 cm | Wt: 1750 kg | Outlet: G 2"'),
  ('STK-HAT-75-MRB', 'HAT 75 - 100 HP (75 kW) Rotary Screw Compressor', 'Machine', 'HAT 75', 'Morbi', 2, 'Units', 1, 12, 980000, 'HAT 75 (100 HP / 75 kW) Single Stage', 'Power: 75 kW (100 HP) | FAD: 475/446/406 CFM @ 7/8/10 BAR | Noise: 77 dB(A) | Dim: 190x126x160 cm | Wt: 1850 kg | Outlet: G 2"'),

  -- Two-Stage Rotary Screw Compressors (PDF Page 5)
  ('STK-HAT-55II-SRT', 'HAT 55 II - 75 HP (55 kW) Two-Stage Screw Compressor', 'Machine', 'HAT 55 II', 'Surat', 2, 'Units', 1, 8, 960000, 'Two-Stage Airend (15% More Energy Efficient)', '2-Stage Airend 4 Rotor | Power: 55 kW (75 HP) | FAD: 460/435 CFM @ 7/8 BAR | Noise: 70 dB(A) | Dim: 2160x1350x1750 mm | Wt: 2320 kg | Outlet: G 2"'),
  ('STK-HAT-75II-MRB', 'HAT 75 II - 100 HP (75 kW) Two-Stage Screw Compressor', 'Machine', 'HAT 75 II', 'Morbi', 2, 'Units', 1, 8, 1180000, 'Two-Stage Airend (15% More Energy Efficient)', '2-Stage Airend 4 Rotor | Power: 75 kW (100 HP) | FAD: 575/545 CFM @ 7/8 BAR | Noise: 73 dB(A) | Dim: 2160x1350x1750 mm | Wt: 2390 kg | Outlet: G 2"'),
  ('STK-HAT-90II-MRB', 'HAT 90 II - 120 HP (90 kW) Two-Stage Screw Compressor', 'Machine', 'HAT 90 II', 'Morbi', 2, 'Units', 1, 6, 1390000, 'Two-Stage Airend (Heavy Vitrified Ceramic Hub)', '2-Stage Airend 4 Rotor | Power: 90 kW (120 HP) | FAD: 695/644 CFM @ 7/8 BAR | Noise: 77 dB(A) | Dim: 2420x1530x1720 mm | Wt: 3110 kg | Outlet: DN 65'),
  ('STK-HAT-110II-RJK', 'HAT 110 II - 150 HP (110 kW) Two-Stage Screw Compressor', 'Machine', 'HAT 110 II', 'Rajkot', 1, 'Units', 1, 4, 1650000, 'Two-Stage Airend (Heavy Forging & Foundry)', '2-Stage Airend 4 Rotor | Power: 110 kW (150 HP) | FAD: 825/742 CFM @ 7/8 BAR | Noise: 79 dB(A) | Dim: 2650x1600x1850 mm | Wt: 3530 kg | Outlet: DN 80'),
  ('STK-HAT-132II-RJK', 'HAT 132 II - 175 HP (132 kW) Two-Stage Screw Compressor', 'Machine', 'HAT 132 II', 'Rajkot', 1, 'Units', 1, 4, 1890000, 'Two-Stage Airend (Mega Industrial Plants)', '2-Stage Airend 4 Rotor | Power: 132 kW (175 HP) | FAD: 985/888 CFM @ 7/8 BAR | Noise: 83 dB(A) | Dim: 2650x1600x1850 mm | Wt: 3600 kg | Outlet: DN 80'),

  -- Air Treatment & Dryers (PDF Page 7)
  ('STK-RAD-100-SRT', 'Refrigerated Air Dryer 100 CFM', 'Machine', 'HT-RAD-100', 'Surat', 4, 'Units', 2, 20, 98000, 'HAT 4 to HAT 22 Screw Compressors', '+3°C pressure dew point moisture removal dryer'),
  ('STK-RAD-150-MRB', 'Refrigerated Air Dryer 150 CFM', 'Machine', 'HT-RAD-150', 'Morbi', 3, 'Units', 2, 18, 145000, 'HAT 30 to HAT 55 Screw Compressors', '+3°C pressure dew point moisture removal dryer'),
  ('STK-ART-1000L-RJK', 'Industrial Air Receiver Tank 1000L (10 Bar)', 'Machine', 'HT-ART-1000L', 'Rajkot', 2, 'Units', 1, 10, 115000, 'Vertical Compressed Air Storage Tank', 'Vertical 1000L Tank with certified safety valve & pressure gauge'),

  -- Spare Parts & Consumables
  ('STK-SP-AF11-SRT', 'Air Filter Cartridge (HAT 4 - HAT 11)', 'Spare Part', 'HT-AF-HAT11', 'Surat', 30, 'Units', 10, 150, 1800, 'HAT 4, HAT 7, HAT 11 Models', '99.9% dedusting intake filter for compact screw series'),
  ('STK-SP-AF37-MRB', 'Air Filter Cartridge (HAT 15 - HAT 37)', 'Spare Part', 'HT-AF-HAT37', 'Morbi', 28, 'Units', 8, 130, 2600, 'HAT 15, HAT 18, HAT 22, HAT 30, HAT 37 Models', 'Heavy duty nano-fiber air filter'),
  ('STK-SP-AF75-RJK', 'Air Filter Cartridge (HAT 45 - HAT 75)', 'Spare Part', 'HT-AF-HAT75', 'Rajkot', 20, 'Units', 6, 90, 3800, 'HAT 45, HAT 55, HAT 75 Models', 'High capacity dust intake filter'),
  ('STK-SP-OF-SRT', 'Spin-On Oil Filter (HAT Series)', 'Spare Part', 'HT-OF-HAT-SO', 'Surat', 25, 'Units', 8, 120, 1950, 'All HAT Single Stage & Two Stage Compressors', 'High pressure spin-on oil filter'),
  ('STK-SP-SEP-MRB', 'Air-Oil Separator Element (HAT 37 - HAT 75)', 'Spare Part', 'HT-SEP-HAT-FL', 'Morbi', 12, 'Units', 4, 40, 8500, 'HAT 37, HAT 45, HAT 55, HAT 75 Models', 'Residual oil content < 3 ppm'),
  ('STK-SP-OIL-SRT', 'Synthetic Compressor Lubricant (ISO VG 46 - 20L)', 'Spare Part', 'HT-OIL-VG46-20L', 'Surat', 18, 'Pails (20L)', 6, 110, 7800, 'All Hi-Tech HAT Rotary Screw Series', '8000-Hour long life synthetic rotary screw lubricant')
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

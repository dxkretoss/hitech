import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error('Error: Please provide valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env before seeding.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPER_ADMIN = {
  name: 'Hi-Tech Super Administrator',
  email: 'admin@hitechair.in',
  password: 'ur0zEmoHAapzu4D9l',
  role: 'Owner'
};

async function seedSuperAdmin() {
  console.log('🌱 Seeding Super Admin user to Supabase Auth...');
  console.log(`Email: ${SUPER_ADMIN.email}`);
  console.log(`Role: ${SUPER_ADMIN.role}`);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      options: {
        data: {
          name: SUPER_ADMIN.name,
          full_name: SUPER_ADMIN.name,
          role: SUPER_ADMIN.role
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.status === 422) {
        console.log('✔ Super Admin user is already registered in Supabase!');
      } else if (error.message.includes('rate limit')) {
        console.log('\n⚠️ Supabase Email Rate Limit Exceeded!');
        console.log('💡 TIP TO FIX IN SUPABASE:');
        console.log('1. Go to Supabase Dashboard -> Authentication -> Providers -> Email');
        console.log('2. Turn OFF "Confirm email" to disable SMTP rate limits.');
        console.log('3. Alternatively, you can log in directly on /admin with these credentials:');
        console.log(`   Email:    ${SUPER_ADMIN.email}`);
        console.log(`   Password: ${SUPER_ADMIN.password}`);
      } else {
        console.error('❌ Error seeding Super Admin:', error.message);
      }
    } else {
      console.log('✅ Super Admin user created successfully!');
      console.log('----------------------------------------------------');
      console.log(`Credentials:`);
      console.log(`Email:    ${SUPER_ADMIN.email}`);
      console.log(`Password: ${SUPER_ADMIN.password}`);
      console.log('----------------------------------------------------');
    }
  } catch (err) {
    console.error('❌ Unexpected error during seed:', err.message);
  }
}

seedSuperAdmin();

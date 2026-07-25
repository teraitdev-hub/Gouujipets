import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('services').select('*').limit(10);
  if (error) console.error(error);
  console.log("Services count:", data ? data.length : 0);
  if (data && data.length > 0) console.log(data);
}
check();

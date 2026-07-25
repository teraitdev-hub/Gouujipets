const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
});
const supabase = createClient(supabaseUrl, supabaseKey);

async function applySql() {
  const sql = fs.readFileSync('supabase/helpdesk_and_journal_setup.sql', 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Error applying SQL:', error);
  } else {
    console.log('Successfully applied SQL:', data);
  }
}

applySql();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
  const { data: primaHub, error: err1 } = await supabase
    .from('companies')
    .select('id')
    .eq('name', 'Prima Hub')
    .single();

  if (err1) {
    console.error("Error finding Prima Hub", err1.message);
    return;
  }

  const { data: users, error: err2 } = await supabase
    .from('company_users')
    .select('user_id')
    .eq('company_id', primaHub.id);

  if (err2) {
    console.error("Error finding company users", err2.message);
    return;
  }

  const { data: authUsers, error: err3 } = await supabase.auth.admin.listUsers();
  
  if (err3) {
    console.error("Error finding auth users", err3.message);
    return;
  }

  const primaUserIds = users.map(u => u.user_id);
  const matchedUsers = authUsers.users.filter(u => primaUserIds.includes(u.id));

  console.log("Usuários na Prima Hub:");
  matchedUsers.forEach(u => {
    console.log(`- ${u.email}`);
  });
}

listUsers();

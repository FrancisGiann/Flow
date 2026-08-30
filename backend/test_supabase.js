require('dotenv').config();
const { supabase } = require('./src/db/supabaseClient');

async function test() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Supabase Success! Found users:", data.length);
  }
}
test();

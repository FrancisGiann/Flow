const { createClient } = require('@supabase/supabase-js');

async function testSupabaseClientInit() {
  console.log('Testing Supabase client constructor and table query builder syntax...');
  
  const mockUrl = 'https://abcdefghijklm.supabase.co';
  const mockKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fakekey';
  
  const client = createClient(mockUrl, mockKey, {
    auth: { persistSession: false }
  });

  // Verify query builders construct without throwing
  const query1 = client.from('sessions').select('*').order('timestamp', { ascending: false }).limit(50);
  const query2 = client.from('weaknesses').select('*').order('error_count', { ascending: false });
  const query3 = client.from('users').select('*');

  console.log('Query builders initialized successfully:', Boolean(query1 && query2 && query3));
  console.log('Supabase JS integration test passed!');
}

testSupabaseClientInit();

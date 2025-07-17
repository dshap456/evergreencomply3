const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  const supabase = createClient(
    'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  );

  try {
    // Test if courses table exists
    const { data, error } = await supabase.from('courses').select('*').limit(1);
    
    if (error) {
      console.log('Error accessing courses table:', error.message);
    } else {
      console.log('Success! Courses table exists');
      console.log('Data:', data);
    }

    // List all tables
    const { data: tables, error: tablesError } = await supabase.rpc('get_schema_tables');
    
    if (tablesError) {
      console.log('Could not list tables:', tablesError.message);
    } else {
      console.log('Available tables:', tables);
    }

  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();
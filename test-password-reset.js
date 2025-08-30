#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://deaidmqcjnyrxnhoxafu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWlkbXFjam55cnhuaG94YWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTk3NDYsImV4cCI6MjA2ODI5NTc0Nn0.3KpK-fC6B72mbRs2BVLKJ10YklOu-uT_ueqJD7Jyngs';

async function testPasswordReset() {
  console.log('🔍 Testing Password Reset Flow\n');
  console.log('================================\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const testEmail = 'evergreentester1@gmail.com';
  const redirectTo = 'https://www.evergreencomply.com/update-password';
  
  console.log(`📧 Testing with email: ${testEmail}`);
  console.log(`🔗 Redirect URL: ${redirectTo}\n`);
  
  try {
    console.log('⏳ Sending password reset request...\n');
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: redirectTo
    });
    
    if (error) {
      console.error('❌ Error occurred:', error);
      console.error('\nError details:');
      console.error('- Message:', error.message);
      console.error('- Status:', error.status);
      console.error('- Name:', error.name);
      return;
    }
    
    console.log('✅ Password reset request sent successfully!');
    console.log('\nResponse data:', JSON.stringify(data, null, 2));
    
    console.log('\n📬 Next steps:');
    console.log('1. Check the email inbox for', testEmail);
    console.log('2. Check spam/junk folder if not in inbox');
    console.log('3. The email should arrive within a few minutes');
    console.log('4. The email will contain a link to reset the password');
    
    console.log('\n⚠️  Important notes:');
    console.log('- If email doesn\'t arrive, SMTP might not be configured');
    console.log('- Default Supabase SMTP only sends 2 emails/hour');
    console.log('- Default SMTP only sends to pre-authorized emails');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testPasswordReset();
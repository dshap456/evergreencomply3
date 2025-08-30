#!/usr/bin/env node

// This script checks recent email activity in Resend
// You'll need to add your Resend API key to run it

const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY_HERE';

async function checkResendEmails() {
  console.log('🔍 Checking Resend Email Activity\n');
  console.log('================================\n');
  
  if (RESEND_API_KEY === 'YOUR_RESEND_API_KEY_HERE') {
    console.error('❌ Please set your RESEND_API_KEY environment variable or update the script');
    console.log('\nRun with: RESEND_API_KEY=re_xxxxx node check-resend-emails.js');
    return;
  }
  
  try {
    // Get list of emails sent
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Resend API Error:', error);
      return;
    }
    
    const data = await response.json();
    
    console.log(`📊 Total emails found: ${data.data?.length || 0}\n`);
    
    // Filter for password reset emails
    const passwordResetEmails = data.data?.filter(email => 
      email.subject?.toLowerCase().includes('password') ||
      email.subject?.toLowerCase().includes('reset') ||
      email.to?.includes('evergreentester1@gmail.com')
    ) || [];
    
    console.log(`🔐 Password reset related emails: ${passwordResetEmails.length}\n`);
    
    // Show recent emails
    console.log('📧 Recent emails (last 10):\n');
    const recentEmails = data.data?.slice(0, 10) || [];
    
    recentEmails.forEach(email => {
      console.log(`  Date: ${email.created_at}`);
      console.log(`  To: ${email.to}`);
      console.log(`  From: ${email.from}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  Status: ${email.last_event}`);
      console.log(`  ID: ${email.id}`);
      console.log('  ---');
    });
    
    // Check for emails to our test user
    console.log('\n🔍 Checking for emails to evergreentester1@gmail.com:');
    const testUserEmails = data.data?.filter(email => 
      email.to?.includes('evergreentester1@gmail.com')
    ) || [];
    
    if (testUserEmails.length > 0) {
      console.log(`Found ${testUserEmails.length} emails to test user:`);
      testUserEmails.forEach(email => {
        console.log(`  - ${email.created_at}: ${email.subject} (Status: ${email.last_event})`);
      });
    } else {
      console.log('  ❌ No emails found to evergreentester1@gmail.com');
      console.log('  This suggests the emails are NOT being sent through Resend');
    }
    
    // Check for bounced emails
    const bouncedEmails = data.data?.filter(email => 
      email.last_event === 'bounced' || email.last_event === 'failed'
    ) || [];
    
    if (bouncedEmails.length > 0) {
      console.log(`\n⚠️  Found ${bouncedEmails.length} bounced/failed emails:`);
      bouncedEmails.forEach(email => {
        console.log(`  - ${email.to}: ${email.subject}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error checking Resend:', err.message);
  }
}

// Also check domain status
async function checkDomainStatus() {
  console.log('\n\n🌐 Checking Domain Status in Resend\n');
  console.log('=====================================\n');
  
  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Could not fetch domains:', error);
      return;
    }
    
    const data = await response.json();
    
    console.log(`📋 Total domains configured: ${data.data?.length || 0}\n`);
    
    data.data?.forEach(domain => {
      console.log(`  Domain: ${domain.name}`);
      console.log(`  Status: ${domain.status}`);
      console.log(`  Region: ${domain.region}`);
      console.log(`  Created: ${domain.created_at}`);
      console.log('  ---');
    });
    
    // Check for evergreencomply.com
    const evergreenDomain = data.data?.find(d => d.name === 'evergreencomply.com');
    if (evergreenDomain) {
      console.log('\n✅ evergreencomply.com is configured');
      console.log(`   Status: ${evergreenDomain.status}`);
      if (evergreenDomain.status !== 'verified') {
        console.log('   ⚠️  WARNING: Domain is not verified! This will prevent email delivery.');
      }
    } else {
      console.log('\n❌ evergreencomply.com is NOT configured in Resend');
      console.log('   This could be the issue - the domain needs to be added and verified');
    }
    
  } catch (err) {
    console.error('❌ Error checking domains:', err.message);
  }
}

// Run both checks
async function main() {
  await checkResendEmails();
  await checkDomainStatus();
  
  console.log('\n\n💡 Next Steps:\n');
  console.log('1. If no emails are showing in Resend, the issue is between Supabase and Resend');
  console.log('2. If emails show as bounced/failed, check the domain verification');
  console.log('3. If domain is not verified, complete the DNS setup in Resend dashboard');
  console.log('4. You may need to update the Resend API key in Supabase SMTP settings');
}

main();
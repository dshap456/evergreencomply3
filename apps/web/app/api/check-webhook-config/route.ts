import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Check if required environment variables are set
  const config = {
    STRIPE_SECRET_KEY: {
      exists: !!process.env.STRIPE_SECRET_KEY,
      startsWith: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'NOT SET',
      length: process.env.STRIPE_SECRET_KEY?.length || 0
    },
    STRIPE_WEBHOOK_SECRET: {
      exists: !!process.env.STRIPE_WEBHOOK_SECRET,
      startsWith: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 7) || 'NOT SET',
      length: process.env.STRIPE_WEBHOOK_SECRET?.length || 0,
      isWhsec: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') || false
    },
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV
  };

  // Validation checks
  const issues = [];
  
  if (!config.STRIPE_SECRET_KEY.exists) {
    issues.push('STRIPE_SECRET_KEY is not set');
  }
  
  if (!config.STRIPE_WEBHOOK_SECRET.exists) {
    issues.push('STRIPE_WEBHOOK_SECRET is not set');
  } else if (!config.STRIPE_WEBHOOK_SECRET.isWhsec) {
    issues.push('STRIPE_WEBHOOK_SECRET should start with "whsec_"');
  }
  
  return NextResponse.json({
    config,
    issues,
    status: issues.length === 0 ? 'Ready for webhooks' : 'Configuration issues found',
    instructions: issues.length > 0 ? 
      'Go to Vercel Dashboard → Settings → Environment Variables and check these values' : 
      'Configuration looks good! Try a test purchase.'
  });
}
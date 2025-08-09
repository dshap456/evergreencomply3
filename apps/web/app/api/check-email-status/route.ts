import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const emailId = searchParams.get('id');
  
  if (!emailId) {
    return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
  }
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Get email details from Resend
    const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ 
        error: 'Failed to get email status',
        details: error,
        status: response.status 
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check email status',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}
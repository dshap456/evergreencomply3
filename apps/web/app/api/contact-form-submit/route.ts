import { NextRequest, NextResponse } from 'next/server';
import { sendContactEmail } from '../../contact/_lib/server/server-actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Contact form API route - received:', body);
    
    // Call the server action directly
    const result = await sendContactEmail(body);
    
    console.log('Contact form API route - result:', result);
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Contact form API route error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
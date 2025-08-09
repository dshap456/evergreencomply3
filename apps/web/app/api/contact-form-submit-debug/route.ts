import { NextRequest, NextResponse } from 'next/server';
import { sendContactEmail } from '../../contact/_lib/server/server-actions';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const debug = {
    steps: [] as any[],
    error: null as any,
    success: false,
    result: null as any,
  };

  try {
    const body = await request.json();
    debug.steps.push({ step: 'Parsed body', body });
    
    console.log('Debug: Starting contact form submission');
    
    try {
      // Call the server action directly
      const result = await sendContactEmail(body);
      debug.steps.push({ step: 'Server action completed', result });
      debug.result = result;
      debug.success = true;
      
      console.log('Debug: Server action succeeded', result);
    } catch (serverActionError) {
      debug.steps.push({ 
        step: 'Server action failed', 
        error: serverActionError instanceof Error ? {
          message: serverActionError.message,
          stack: serverActionError.stack,
          name: serverActionError.name
        } : serverActionError
      });
      throw serverActionError;
    }
    
    const duration = Date.now() - startTime;
    debug.steps.push({ step: 'Completed', duration: `${duration}ms` });
    
    return NextResponse.json({ 
      success: true, 
      result: debug.result,
      debug: process.env.NODE_ENV === 'development' ? debug : undefined
    });
  } catch (error) {
    console.error('Debug: Contact form error', error);
    debug.error = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? debug : undefined
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  try {
    const adminClient = getSupabaseServerAdminClient();
    
    // Get all published courses
    const { data: courses, error } = await adminClient
      .from('courses')
      .select('*')
      .eq('status', 'published');
    
    if (error) throw error;
    
    // Get what's in localStorage (passed as query param for testing)
    const localStorageData = request.nextUrl.searchParams.get('cart');
    let cartItems = [];
    if (localStorageData) {
      try {
        cartItems = JSON.parse(localStorageData);
      } catch (e) {
        cartItems = [];
      }
    }
    
    // Debug info
    const debugInfo = {
      publishedCourses: courses?.map(c => ({
        id: c.id,
        title: c.title,
        titleLength: c.title.length,
        titleWithQuotes: `"${c.title}"`,
        slug: c.slug,
        slugLength: c.slug?.length,
        sku: c.sku,
        price: c.price,
        billing_product_id: c.billing_product_id
      })),
      cartItems: cartItems,
      matchAttempts: cartItems.map((item: any) => {
        const matchBySlug = courses?.find(c => c.slug === item.courseId);
        const matchById = courses?.find(c => c.id === item.courseId);
        const matchBySku = courses?.find(c => c.sku === item.courseId);
        
        return {
          cartCourseId: item.courseId,
          cartQuantity: item.quantity,
          matchBySlug: matchBySlug ? `Found: ${matchBySlug.title}` : 'Not found',
          matchById: matchById ? `Found: ${matchById.title}` : 'Not found',
          matchBySku: matchBySku ? `Found: ${matchBySku.title}` : 'Not found',
          allSlugs: courses?.map(c => c.slug)
        };
      })
    };
    
    return NextResponse.json(debugInfo, { status: 200 });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Helper to test what's in localStorage
  try {
    const body = await request.json();
    const { cart } = body;
    
    return NextResponse.json({
      received: cart,
      parsed: typeof cart === 'string' ? JSON.parse(cart) : cart
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse' }, { status: 400 });
  }
}
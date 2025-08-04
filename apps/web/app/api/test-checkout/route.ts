import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartItems } = body;

    // Log what we received
    console.log('Test checkout received:', JSON.stringify(cartItems, null, 2));

    // Test the mapping
    const results = cartItems.map((item: any) => {
      let priceId: string;
      let error: string | null = null;

      try {
        switch (item.courseId) {
          case 'dot-hazmat-general':
            priceId = 'price_1RsDQh97cNCBYOcXZBML0Cwf';
            break;
          case 'dot-hazmat-advanced':
            priceId = 'price_1RsDev97cNCBYOcX008NiFR8';
            break;
          case 'epa-rcra':
            priceId = 'price_1RsDf697cNCBYOcXkMlo2mPt';
            break;
          default:
            throw new Error(`Unknown course: ${item.courseId}`);
        }
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
        priceId = 'error';
      }

      return {
        courseId: item.courseId,
        quantity: item.quantity,
        priceId,
        error,
      };
    });

    return NextResponse.json({ 
      success: true,
      cartItems,
      results,
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
    });
  }
}
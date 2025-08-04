import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });

    // Price IDs from our config
    const priceIds = [
      'price_1RsDQh97cNCBYOcXZBML0Cwf', // DOT HAZMAT
      'price_1RsDev97cNCBYOcX008NiFR8', // Advanced HAZMAT
      'price_1RsDf697cNCBYOcXkMlo2mPt', // EPA RCRA
    ];

    const results = await Promise.all(
      priceIds.map(async (id) => {
        try {
          const price = await stripe.prices.retrieve(id);
          return {
            id,
            exists: true,
            active: price.active,
            unitAmount: price.unit_amount,
            currency: price.currency,
            productId: price.product,
            type: price.type,
            recurring: price.recurring,
          };
        } catch (error) {
          return {
            id,
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify prices' },
      { status: 500 }
    );
  }
}
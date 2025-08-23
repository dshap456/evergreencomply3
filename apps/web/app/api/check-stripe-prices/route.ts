import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    // The price IDs from your webhook
    const priceIds = [
      'price_1RsDQh97cNCBYOcXZBML0Cwf',
      'price_1RsDev97cNCBYOcX008NiFR8', 
      'price_1RsDf697cNCBYOcXkMlo2mPt'
    ];
    
    const results = [];
    
    for (const priceId of priceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        const product = await stripe.products.retrieve(price.product as string);
        
        results.push({
          priceId: priceId,
          productName: product.name,
          amount: price.unit_amount,
          currency: price.currency,
          active: price.active,
          productActive: product.active
        });
      } catch (err) {
        results.push({
          priceId: priceId,
          error: 'Price not found or error retrieving'
        });
      }
    }
    
    // Also list all active prices to see what's actually in Stripe
    const allPrices = await stripe.prices.list({
      active: true,
      limit: 100
    });
    
    const activePrices = [];
    for (const price of allPrices.data) {
      try {
        const product = await stripe.products.retrieve(price.product as string);
        if (product.name.includes('HAZMAT') || product.name.includes('EPA') || product.name.includes('DOT')) {
          activePrices.push({
            priceId: price.id,
            productName: product.name,
            amount: price.unit_amount,
            currency: price.currency
          });
        }
      } catch (err) {
        // Skip
      }
    }
    
    return NextResponse.json({
      configuredPrices: results,
      activeCourseprices: activePrices,
      recommendation: 'Check if the price IDs in the webhook match what is actually in Stripe'
    });
    
  } catch (error) {
    console.error('Error checking Stripe prices:', error);
    return NextResponse.json({
      error: 'Failed to check prices',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}
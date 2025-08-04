import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';

// Map cart IDs to billing config IDs
const COURSE_MAPPING = {
  'dot-hazmat-general': 'dot-hazmat',
  'dot-hazmat-advanced': 'advanced-hazmat',
  'epa-rcra': 'epa-rcra',
} as const;

// Validation schema
const CheckoutSchema = z.object({
  cartItems: z.array(z.object({
    courseId: z.string(),
    quantity: z.number().min(1),
  })).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = CheckoutSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid cart data' }, { status: 400 });
    }
    
    const { cartItems } = result.data;

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    for (const item of cartItems) {
      const courseId = item.courseId as keyof typeof COURSE_MAPPING;
      
      // Map to the correct price ID based on course
      let priceId: string;
      switch (courseId) {
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

      lineItems.push({
        price: priceId,
        quantity: item.quantity,
      });
    }

    console.log('Creating Stripe checkout with line items:', lineItems);

    // Create Stripe checkout session directly
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/cart`,
      customer_email: undefined, // Let Stripe collect the email
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: 'Evergreen Comply Training Course(s)',
        },
      },
      metadata: {
        type: 'training-purchase',
        items: JSON.stringify(cartItems),
      },
    });

    console.log('Checkout session created:', session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Provide more detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
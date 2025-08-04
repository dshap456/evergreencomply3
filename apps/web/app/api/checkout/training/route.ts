import { NextRequest, NextResponse } from 'next/server';
import { createBillingGatewayService } from '@kit/billing-gateway';
import { z } from 'zod';
import billingConfig from '~/config/billing.config';

// Map cart IDs to billing config IDs
const COURSE_MAPPING = {
  'dot-hazmat-general': 'dot-hazmat',
  'dot-hazmat-advanced': 'advanced-hazmat',
  'epa-rcra': 'epa-rcra',
};

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

    // For now, we'll use individual pricing for all purchases
    // Later you can add logic to determine team vs individual
    const lineItems = cartItems.map((item: any) => {
      const billingProductId = COURSE_MAPPING[item.courseId as keyof typeof COURSE_MAPPING];
      const product = billingConfig.products.find(p => p.id === billingProductId);
      
      if (!product) {
        throw new Error(`Product not found: ${item.courseId}`);
      }

      // Use individual plan for now
      const plan = product.plans.find(p => p.id.includes('individual'));
      if (!plan) {
        throw new Error(`Individual plan not found for: ${product.id}`);
      }

      return {
        price: plan.lineItems[0].id, // Stripe price ID
        quantity: item.quantity,
      };
    });

    // Create Stripe checkout session
    const billingGateway = createBillingGatewayService('stripe');
    
    const session = await billingGateway.createCheckoutSession({
      lineItems,
      mode: 'payment', // one-time payment
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/cart`,
      metadata: {
        type: 'training-purchase',
        items: JSON.stringify(cartItems),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
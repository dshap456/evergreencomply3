import { NextResponse } from 'next/server';
import { z } from 'zod';
import { enhanceRouteHandler } from '@kit/next/routes';
import { createBillingGatewayService } from '@kit/billing-gateway';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const CheckoutSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().nullable(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
      name: z.string(),
      description: z.string(),
    })
  ).min(1),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

export const POST = enhanceRouteHandler(
  async function ({ body, user }) {
    const { items, success_url, cancel_url } = body;
    
    // For guest checkout, we don't require authentication
    // but if user is logged in, we use their account
    const customerId = user?.id ? await getOrCreateCustomerId(user.id) : undefined;
    
    // Get billing provider from environment
    const provider = process.env.NEXT_PUBLIC_BILLING_PROVIDER || 'stripe';
    const billingGateway = createBillingGatewayService(provider);
    
    try {
      // Create line items for checkout
      const lineItems = items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      }));
      
      // Create checkout session
      const session = await billingGateway.createCheckoutSession({
        line_items: lineItems,
        mode: 'payment',
        success_url,
        cancel_url,
        customer: customerId,
        metadata: {
          items: JSON.stringify(items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          }))),
        },
      });
      
      return NextResponse.json({
        sessionId: session.id,
        sessionUrl: session.url,
      });
      
    } catch (error) {
      console.error('Checkout session error:', error);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }
  },
  {
    auth: false, // Allow guest checkout
    schema: CheckoutSchema,
  }
);

async function getOrCreateCustomerId(userId: string): Promise<string | undefined> {
  const client = getSupabaseServerClient();
  
  // Check if customer already exists
  const { data: customer } = await client
    .from('billing_customers')
    .select('customer_id')
    .eq('account_id', userId)
    .maybeSingle();
    
  if (customer?.customer_id) {
    return customer.customer_id;
  }
  
  // For new customers, let Stripe create the customer during checkout
  return undefined;
}
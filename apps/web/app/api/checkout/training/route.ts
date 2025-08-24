import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

// Map frontend course IDs to database identifiers
// Frontend sends these exact slugs from the course pages
const COURSE_MAPPING = {
  'dot-hazmat': 'dot-hazmat',
  'advanced-hazmat': 'advanced-hazmat',
  'epa-rcra': 'epa-rcra',
} as const;

// Validation schema
const CheckoutSchema = z.object({
  cartItems: z.array(z.object({
    courseId: z.string(),
    quantity: z.number().min(1),
  })).min(1),
  accountType: z.enum(['personal', 'team']).optional().default('personal'),
  accountId: z.string().uuid().optional(), // For team purchases
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = CheckoutSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid cart data' }, { status: 400 });
    }
    
    const { cartItems, accountType, accountId } = result.data;

    // Get authenticated user
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    
    if (!auth.data) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = auth.data;

    // Determine which account is making the purchase
    let purchaseAccountId: string;
    
    if (accountType === 'team' && accountId) {
      // Verify user has access to the team account
      const { data: hasAccess } = await client
        .rpc('has_role_on_account', {
          account_id: accountId,
        });
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized for this team' }, { status: 403 });
      }
      
      purchaseAccountId = accountId;
    } else {
      // Personal purchase - use user's personal account ID
      purchaseAccountId = user.id;
    }

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
        case 'dot-hazmat':
          priceId = 'price_1RsDQh97cNCBYOcXZBML0Cwf';
          break;
        case 'advanced-hazmat':
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
    console.log('Purchase account ID:', purchaseAccountId);

    // Determine success URL based on account type
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com';
    const successPath = accountType === 'team' 
      ? `/home/${purchaseAccountId}/courses/seats?purchase=success&session_id={CHECKOUT_SESSION_ID}`
      : `/home/courses?purchase=success&session_id={CHECKOUT_SESSION_ID}`;
    
    // Create Stripe checkout session with proper account reference
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}${successPath}`,
      cancel_url: `${baseUrl}/cart`,
      customer_email: user.email,
      // CRITICAL: Set client_reference_id to the account making the purchase
      client_reference_id: purchaseAccountId,
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: 'Evergreen Comply Training Course(s)',
        },
      },
      metadata: {
        type: 'training-purchase',
        accountType: accountType,
        purchaseAccountId: purchaseAccountId,
        userId: user.id,
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
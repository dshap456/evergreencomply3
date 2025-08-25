import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Map frontend course IDs to database identifiers
// Frontend sends these exact slugs from the course pages
const COURSE_MAPPING = {
  'dot-hazmat': 'dot-hazmat',
  'dot-hazmat-general': 'dot-hazmat', // Alternative slug for the same course
  'advanced-hazmat': 'advanced-hazmat',
  'epa-rcra': 'epa-rcra',
} as const;

// Validation schema
const CheckoutSchema = z.object({
  cartItems: z.array(z.object({
    courseId: z.string(),
    quantity: z.number().min(1),
  })).min(1),
  customerName: z.string().optional(),  // Make customer name optional
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
    
    const { cartItems, customerName, accountType, accountId } = result.data;

    // Get authenticated user (optional for guest checkout)
    const client = getSupabaseServerClient();
    
    // Try to get the session but don't require it
    const { data: { session } } = await client.auth.getSession();
    const user = session?.user || null;

    // Determine which account is making the purchase
    let purchaseAccountId: string = '';
    let accountSlug: string | null = null;
    
    if (accountType === 'team' && accountId) {
      // Team purchases require authentication
      if (!user) {
        return NextResponse.json({ error: 'Authentication required for team purchases' }, { status: 401 });
      }
      
      // Verify user has access to the team account
      const { data: hasAccess } = await client
        .rpc('has_role_on_account', {
          account_id: accountId,
        });
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized for this team' }, { status: 403 });
      }
      
      // Get the team account slug for redirect
      const { data: teamAccount } = await client
        .from('accounts')
        .select('slug')
        .eq('id', accountId)
        .single();
      
      accountSlug = teamAccount?.slug || null;
      purchaseAccountId = accountId;
    } else if (user) {
      // Personal purchase with authenticated user
      purchaseAccountId = user.id;
    } else {
      // Guest purchase - no account ID yet
      purchaseAccountId = '';
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
        case 'dot-hazmat-general':  // Both map to the same DOT HAZMAT course
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
    let successPath: string;
    
    if (accountType === 'team' && accountSlug) {
      successPath = `/home/${accountSlug}/courses/seats?purchase=success&session_id={CHECKOUT_SESSION_ID}`;
    } else if (user) {
      successPath = `/home/courses?purchase=success&session_id={CHECKOUT_SESSION_ID}`;
    } else {
      // Guest checkout - redirect to sign-up after payment
      successPath = `/auth/sign-up?purchase=success&session_id={CHECKOUT_SESSION_ID}`;
    }
    
    // Create Stripe checkout session with proper account reference
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}${successPath}`,
      cancel_url: `${baseUrl}/cart`,
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: 'Evergreen Comply Training Course(s)',
        },
      },
      metadata: {
        type: 'training-purchase',
        customerName: customerName || '',  // Add customer name to metadata (empty string if not provided)
        accountType: accountType,
        purchaseAccountId: purchaseAccountId || 'guest',
        userId: user?.id || 'guest',
        items: JSON.stringify(cartItems),
      },
    };
    
    // Only add email and client_reference_id if we have them
    if (user?.email) {
      sessionParams.customer_email = user.email;
    }
    if (purchaseAccountId) {
      sessionParams.client_reference_id = purchaseAccountId;
    }
    
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    console.log('Checkout session created:', checkoutSession.id);

    return NextResponse.json({ url: checkoutSession.url });
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
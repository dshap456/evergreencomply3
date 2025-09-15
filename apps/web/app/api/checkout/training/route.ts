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

    // Get authenticated user (required now)
    const client = getSupabaseServerClient();
    const { data: { session } } = await client.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const user = session.user;

    // Determine the purchase account based on account type
    // For team purchases with explicit accountId, use that
    // Otherwise use the user's personal account
    let purchaseAccountId = user.id;
    
    if (accountType === 'team' && accountId) {
      // Verify the user has access to this team account
      const { data: membership } = await client
        .from('accounts_memberships')
        .select('account_id')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .single();
      
      if (membership) {
        purchaseAccountId = accountId;
        console.log('Using team account for purchase:', accountId);
      } else {
        console.warn('User does not have access to team account:', accountId);
        // Fall back to personal account
      }
    } else if (accountType === 'team') {
      // Team purchase but no specific account ID provided
      // Try to find or create a team account for this user
      const { data: teamAccounts } = await client
        .from('accounts_memberships')
        .select('account_id, accounts!inner(id, is_personal_account)')
        .eq('user_id', user.id)
        .eq('accounts.is_personal_account', false);
      
      if (teamAccounts && teamAccounts.length > 0) {
        // Use the first team account found
        purchaseAccountId = teamAccounts[0].account_id;
        console.log('Using existing team account:', purchaseAccountId);
      } else {
        // No team account exists - webhook will handle creation
        console.log('No team account found, will create during webhook processing');
      }
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
          priceId = 'price_1S5Cnq97cNCBYOcXYjFFdmEm';  // $119 price
          break;
        case 'advanced-hazmat':
          priceId = 'price_1S5CnD97cNCBYOcX4ehVBpo6';  // $149 price  
          break;
        case 'epa-rcra':
          priceId = 'price_1S5CmP97cNCBYOcXEKzqDOJs';  // $119 price
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

    // Determine success URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com';
    // 80/20: send users to a dedicated success page that fires GA4 purchase
    // (team vs personal routing can happen from there if needed)
    const successPath = `/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    
    // Create Stripe checkout session with proper account reference
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}${successPath}`,
      cancel_url: `${baseUrl}/cart`,
      allow_promotion_codes: true,
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: 'Evergreen Comply Training Course(s)',
        },
      },
      metadata: {
        type: 'training-purchase',
        customerName: customerName || '',  // Empty for multi-seat purchases
        accountType: accountType,
        purchaseAccountId: purchaseAccountId,
        userId: user.id,
        items: JSON.stringify(cartItems),
      },
    };
    
    // Add user email and ALWAYS use user ID as reference
    // The webhook will determine the correct account based on quantity
    sessionParams.customer_email = user.email;
    sessionParams.client_reference_id = user.id;
    
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

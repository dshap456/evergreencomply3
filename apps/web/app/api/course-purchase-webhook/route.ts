// Clean course purchase webhook - completely isolated
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

// Map Stripe price IDs to course slugs
const PRICE_TO_COURSE_SLUG_MAP = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat-general',
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
} as const;

// GET endpoint to verify the webhook is deployed
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    endpoint: 'course-purchase-webhook',
    message: 'Webhook endpoint is deployed and ready to receive POST requests from Stripe',
    timestamp: new Date().toISOString(),
    accepts: 'POST requests with checkout.session.completed events',
    webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    stripe_key_configured: !!process.env.STRIPE_SECRET_KEY,
  });
}

// CRITICAL: Disable body parsing for webhook signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const webhookTimestamp = new Date().toISOString();
  
  // CRITICAL: Log immediately to prove webhook is being called
  console.error('🔴🔴🔴 COURSE WEBHOOK ACTUALLY CALLED 🔴🔴🔴');
  console.error('🔴 Timestamp:', webhookTimestamp);
  console.error('🔴 URL:', request.url);
  console.error('🔴 Headers:', Object.fromEntries(request.headers.entries()));
  console.error('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴');
  
  // IMMEDIATELY write to database to prove webhook was called
  const adminClient = getSupabaseServerAdminClient();
  
  // Return early with detailed response for debugging
  const debugMode = request.headers.get('x-debug-mode') === 'true';
  
  try {
    // 1. Check if body was already read
    if (request.bodyUsed) {
      console.error('[COURSE-WEBHOOK] ⚠️ WARNING: Request body was already consumed!');
      return NextResponse.json({ 
        error: 'Body already consumed',
        details: 'Request body was read before webhook handler'
      }, { status: 500 });
    }
    
    // 2. Read the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    console.error('[COURSE-WEBHOOK] Body received, length:', body.length);
    console.error('[COURSE-WEBHOOK] First 100 chars of body:', body.substring(0, 100));
    console.error('[COURSE-WEBHOOK] Signature present:', !!signature);
    console.error('[COURSE-WEBHOOK] Signature value:', signature);
    console.error('[COURSE-WEBHOOK] Webhook secret configured:', !!process.env.STRIPE_WEBHOOK_SECRET);
    console.error('[COURSE-WEBHOOK] Webhook secret first 20 chars:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 20));
    
    // Log this attempt to database for debugging
    try {
      const logResult = await adminClient.from('webhook_logs').insert({
        webhook_name: 'course-purchase-webhook',
        called_at: new Date().toISOString(),
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: body && body.length > 0 ? body.substring(0, 5000) : null,
      });
      
      if (logResult.error) {
        console.error('[COURSE-WEBHOOK] Failed to log webhook:', logResult.error);
      }
    } catch (e) {
      console.error('[COURSE-WEBHOOK] Exception logging webhook:', e);
    }
    
    if (!signature) {
      console.error('[COURSE-WEBHOOK] ❌ No signature provided - returning error');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      console.error('[COURSE-WEBHOOK] ✅ Signature verified successfully');
    } catch (err: any) {
      console.error('[COURSE-WEBHOOK] ❌ Signature verification failed:', err.message);
      console.error('[COURSE-WEBHOOK] Error type:', err.type);
      console.error('[COURSE-WEBHOOK] Webhook secret:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 20) + '...');
      
      // CRITICAL: Return 400 so Stripe will retry!
      // Never silently fail webhook processing
      return NextResponse.json({ 
        error: 'Invalid webhook signature',
        message: err.message,
        details: 'Check STRIPE_WEBHOOK_SECRET environment variable'
      }, { status: 400 });
    }
    
    // 2. Only process checkout.session.completed
    console.error('[COURSE-WEBHOOK] Event type:', event.type);
    console.error('[COURSE-WEBHOOK] Event ID:', event.id);
    
    if (event.type !== 'checkout.session.completed') {
      console.error('[COURSE-WEBHOOK] Not a checkout completion, ignoring');
      return NextResponse.json({ received: true });
    }
    
    const session = event.data.object as Stripe.Checkout.Session;
    
    // 3. Log all session data
    console.error('[COURSE-WEBHOOK] Session data:', {
      id: session.id,
      client_reference_id: session.client_reference_id,
      customer_email: session.customer_email,
      metadata: session.metadata,
      payment_status: session.payment_status,
    });
    
    // 4. Check if this is a course purchase (handle both metadata types)
    const isCoursePurchase = session.metadata?.type === 'training-purchase' || 
                            session.metadata?.type === 'course_purchase';
                            
    console.error('[COURSE-WEBHOOK] Is course purchase?:', isCoursePurchase);
    console.error('[COURSE-WEBHOOK] Metadata type:', session.metadata?.type);
                            
    if (!isCoursePurchase) {
      console.error('[COURSE-WEBHOOK] ❌ Not a course purchase, ignoring. Metadata:', session.metadata);
      return NextResponse.json({ received: true });
    }
    
    console.error('[COURSE-WEBHOOK] ✅ This IS a course purchase, processing...');
    
    // 5. Check client_reference_id
    if (!session.client_reference_id) {
      console.error('[COURSE-WEBHOOK] ERROR: No client_reference_id in session!');
      // Still try to process with email fallback
    }
    
    // 6. Get line items
    console.log('[COURSE-WEBHOOK] Fetching line items...');
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    console.log('[COURSE-WEBHOOK] Found', lineItems.data.length, 'line items');
    
    // Calculate total quantity to determine if this is a team purchase
    let totalQuantity = 0;
    for (const item of lineItems.data) {
      totalQuantity += item.quantity || 1;
    }
    console.log('[COURSE-WEBHOOK] Total quantity across all items:', totalQuantity);
    
    // 7. Get admin client for database operations
    const adminClient = getSupabaseServerAdminClient();
    
    // 8. For multi-seat purchases (2+), create or get team account
    let purchaseAccountId = session.client_reference_id;
    
    if (totalQuantity >= 2 && purchaseAccountId) {
      console.error('[COURSE-WEBHOOK] 🏢 Multi-seat purchase detected (qty:', totalQuantity, '), handling team account...');
      console.error('[COURSE-WEBHOOK] User ID for team lookup:', purchaseAccountId);
      
      // Check if user already has a team account where they are the manager
      // First, try to find by team_manager role
      const { data: teamMemberships, error: teamLookupError } = await adminClient
        .from('accounts_memberships')
        .select('account_id')
        .eq('user_id', purchaseAccountId)
        .eq('account_role', 'team_manager');
      
      if (teamLookupError) {
        console.error('[COURSE-WEBHOOK] Error looking up team by role:', teamLookupError);
      }
      
      console.error('[COURSE-WEBHOOK] Team memberships found:', teamMemberships);
      
      let existingTeam = null;
      
      // Filter to only non-personal accounts
      if (teamMemberships && teamMemberships.length > 0) {
        for (const membership of teamMemberships) {
          const { data: account } = await adminClient
            .from('accounts')
            .select('is_personal_account')
            .eq('id', membership.account_id)
            .single();
          
          if (account && !account.is_personal_account) {
            existingTeam = membership;
            break;
          }
        }
      }
      
      // If no team found by membership, check if user owns any team accounts directly
      if (!existingTeam) {
        console.error('[COURSE-WEBHOOK] No team found by membership, checking owned accounts...');
        const { data: ownedTeam } = await adminClient
          .from('accounts')
          .select('id')
          .eq('primary_owner_user_id', purchaseAccountId)
          .eq('is_personal_account', false)
          .limit(1)
          .single();
        
        if (ownedTeam) {
          existingTeam = { account_id: ownedTeam.id };
          console.error('[COURSE-WEBHOOK] Found team by ownership:', ownedTeam.id);
        }
      }
      
      if (existingTeam) {
        purchaseAccountId = existingTeam.account_id;
        console.error('[COURSE-WEBHOOK] ✅ Using existing team account:', purchaseAccountId);
      } else {
        console.error('[COURSE-WEBHOOK] No existing team, creating new one...');
        
        // Create new team account
        const emailPrefix = session.customer_email?.split('@')[0] || 'team';
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const teamSlug = `${emailPrefix}-team-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        
        console.error('[COURSE-WEBHOOK] Creating team with:', {
          name: `${emailPrefix}'s Team`,
          slug: teamSlug,
          owner: purchaseAccountId,
        });
        
        const { data: newTeam, error: teamError } = await adminClient
          .from('accounts')
          .insert({
            primary_owner_user_id: purchaseAccountId,
            name: `${emailPrefix}'s Team`,
            slug: teamSlug,
            is_personal_account: false,
          })
          .select()
          .single();
        
        if (teamError || !newTeam) {
          console.error('[COURSE-WEBHOOK] ❌ Failed to create team account:', teamError);
          console.error('[COURSE-WEBHOOK] Team creation error details:', {
            code: teamError?.code,
            message: teamError?.message,
            hint: teamError?.hint,
          });
        } else {
          console.error('[COURSE-WEBHOOK] ✅ Team account created:', newTeam.id);
          
          // Add user as team_manager
          const { error: memberError } = await adminClient
            .from('accounts_memberships')
            .insert({
              user_id: session.client_reference_id!,
              account_id: newTeam.id,
              account_role: 'team_manager',
            });
          
          if (memberError) {
            console.error('[COURSE-WEBHOOK] ❌ Failed to add team membership:', memberError);
          } else {
            purchaseAccountId = newTeam.id;
            console.error('[COURSE-WEBHOOK] ✅ Team membership added, using team account:', purchaseAccountId);
          }
        }
      }
    } else {
      console.error('[COURSE-WEBHOOK] 👤 Single seat purchase or no user ID, using personal account');
    }
    
    // 9. Process each item with the determined account
    
    for (const item of lineItems.data) {
      const priceId = item.price?.id;
      console.log('[COURSE-WEBHOOK] Processing item:', {
        priceId,
        description: item.description,
        quantity: item.quantity,
      });
      
      if (!priceId) continue;
      
      const courseSlug = PRICE_TO_COURSE_SLUG_MAP[priceId as keyof typeof PRICE_TO_COURSE_SLUG_MAP];
      if (!courseSlug) {
        console.log('[COURSE-WEBHOOK] Price not mapped to course slug:', priceId);
        continue;
      }
      
      // Use client_reference_id or try to find/create user by email
      let accountId = session.client_reference_id;
      
      if (!accountId && session.customer_email) {
        console.log('[COURSE-WEBHOOK] No client_reference_id, checking for existing user:', session.customer_email);
        
        // First, check if user exists in auth.users
        const { data: authUser } = await adminClient.auth.admin.listUsers({
          filter: `email.eq.${session.customer_email}`,
          perPage: 1,
        });
        
        if (authUser?.users?.length > 0) {
          // User exists in auth, get their account
          accountId = authUser.users[0].id;
          console.log('[COURSE-WEBHOOK] Found existing auth user:', accountId);
        } else {
          // Create new user
          console.log('[COURSE-WEBHOOK] Creating new user for:', session.customer_email);
          
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: session.customer_email,
            email_confirm: true, // Auto-confirm email since they paid
            user_metadata: {
              source: 'course_purchase',
            }
          });
          
          if (createError || !newUser?.user) {
            console.error('[COURSE-WEBHOOK] Failed to create user:', createError);
            continue;
          }
          
          accountId = newUser.user.id;
          console.log('[COURSE-WEBHOOK] Created new user with ID:', accountId);
          
          // The user creation trigger should have created a personal account
          // Wait a moment for the trigger to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!accountId) {
        console.error('[COURSE-WEBHOOK] ERROR: Cannot determine account ID!');
        continue;
      }
      
      // Process the purchase with the correct account (team or personal)
      // CRITICAL FIX: Use purchaseAccountId if it was set (team account), otherwise use accountId (personal)
      const finalAccountId = purchaseAccountId || accountId;
      
      if (!finalAccountId) {
        console.error('[COURSE-WEBHOOK] ❌ CRITICAL: No account ID available for purchase!');
        continue;
      }
      
      console.error('[COURSE-WEBHOOK] Calling process_course_purchase_by_slug:', {
        courseSlug,
        accountId: finalAccountId,
        sessionId: session.id,
        isTeamPurchase: totalQuantity >= 2,
        originalUserId: session.client_reference_id,
      });
      
      const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
        p_course_slug: courseSlug,
        p_account_id: finalAccountId,
        p_payment_id: session.id,
        p_quantity: item.quantity || 1,
        p_customer_name: session.customer_details?.name || session.customer_email || null,
      });
      
      if (error) {
        console.error('[COURSE-WEBHOOK] Database error:', {
          error,
          code: error.code,
          message: error.message,
          hint: error.hint,
          details: error.details,
        });
        
        // Try to get more info about the course
        const { data: courseCheck } = await adminClient
          .from('courses')
          .select('id, title, slug, billing_product_id')
          .eq('slug', courseSlug)
          .single();
          
        console.error('[COURSE-WEBHOOK] Course lookup by slug:', {
          courseSlug,
          found: !!courseCheck,
          courseData: courseCheck,
        });
      } else {
        console.log('[COURSE-WEBHOOK] SUCCESS! Enrollment created:', data);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log('[COURSE-WEBHOOK] Completed in', duration, 'ms');
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('[COURSE-WEBHOOK] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error }, 
      { status: 500 }
    );
  }
}
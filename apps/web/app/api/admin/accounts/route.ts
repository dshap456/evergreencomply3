import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  try {
    // First check if user is authenticated
    const client = getSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get accounts using admin client
    const adminClient = getSupabaseServerAdminClient();
    const { data: accounts, error } = await adminClient
      .from('accounts')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading accounts:', error);
      return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
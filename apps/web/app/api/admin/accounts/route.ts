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

    // Enforce super admin guard before using admin client
    const { data: isSuperAdmin, error: guardError } = await client.rpc('is_super_admin');
    if (guardError) {
      return NextResponse.json({ error: 'Failed to verify privileges' }, { status: 500 });
    }
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

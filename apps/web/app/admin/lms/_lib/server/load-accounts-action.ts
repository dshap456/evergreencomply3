'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export const loadAccountsAction = enhanceAction(
  async function () {
    const client = getSupabaseServerAdminClient();

    const { data: accounts, error } = await client
      .from('accounts')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading accounts:', error);
      throw new Error(`Failed to load accounts: ${error.message}`);
    }

    return accounts || [];
  },
  {
    auth: true,
  }
);
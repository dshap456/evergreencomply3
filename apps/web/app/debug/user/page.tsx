import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createAccountsApi } from '@kit/accounts/api';

export default async function DebugUserPage() {
  const client = getSupabaseServerClient();
  
  try {
    // Get current user
    const { data: userData, error: userError } = await client.auth.getUser();
    
    // Check if user has personal account
    const { data: accounts, error: accountsError } = await client
      .from('accounts')
      .select('*')
      .eq('primary_owner_user_id', userData?.user?.id)
      .eq('is_personal_account', true);
    
    // Try the workspace view
    const api = createAccountsApi(client);
    let workspaceData = null;
    let workspaceError = null;
    
    try {
      workspaceData = await api.getAccountWorkspace();
    } catch (error) {
      workspaceError = error;
    }
    
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-2xl font-bold">User Debug Information</h1>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-lg font-semibold">User Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({ userData, userError }, null, 2)}
            </pre>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold">Personal Accounts</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({ accounts, accountsError }, null, 2)}
            </pre>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold">Workspace Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({ workspaceData, workspaceError }, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <pre className="bg-red-100 p-4 rounded text-sm overflow-auto mt-4">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }
}
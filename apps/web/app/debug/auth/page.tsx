import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function DebugAuthPage() {
  const client = getSupabaseServerClient();
  
  try {
    // Get current user
    const { data: userData, error: userError } = await client.auth.getUser();
    
    // Get session info
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    
    // Check MFA factors
    const { data: mfaData, error: mfaError } = await client.auth.mfa.listFactors();
    
    // Test super admin functions
    let isSuperAdminResult = null;
    let isAal2Result = null;
    
    try {
      const { data: superAdminData } = await client.rpc('is_super_admin');
      isSuperAdminResult = superAdminData;
    } catch (error) {
      isSuperAdminResult = { error: error instanceof Error ? error.message : String(error) };
    }
    
    try {
      const { data: aal2Data } = await client.rpc('is_aal2');
      isAal2Result = aal2Data;
    } catch (error) {
      isAal2Result = { error: error instanceof Error ? error.message : String(error) };
    }
    
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-2xl font-bold">Authentication Debug</h1>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-lg font-semibold">User Auth Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({ userData, userError }, null, 2)}
            </pre>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold">Session Data (AAL Level)</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({ sessionData, sessionError }, null, 2)}
            </pre>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold">MFA Factors</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({ mfaData, mfaError }, null, 2)}
            </pre>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold">Function Results</h2>
            <div className="space-y-2">
              <div>
                <strong>is_super_admin():</strong>
                <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                  {JSON.stringify(isSuperAdminResult, null, 2)}
                </pre>
              </div>
              <div>
                <strong>is_aal2():</strong>
                <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                  {JSON.stringify(isAal2Result, null, 2)}
                </pre>
              </div>
            </div>
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
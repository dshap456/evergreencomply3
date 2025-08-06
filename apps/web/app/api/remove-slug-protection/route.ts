import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  const { action } = await request.json();
  const supabase = getSupabaseServerAdminClient();
  
  try {
    if (action === 'disable') {
      // Drop the protective trigger
      const { error } = await supabase.rpc('exec_sql', {
        sql: 'DROP TRIGGER IF EXISTS protect_critical_slugs_trigger ON public.courses'
      }).single().catch(async () => {
        // If RPC doesn't work, try direct query
        const { error } = await supabase
          .from('pg_trigger')
          .delete()
          .eq('tgname', 'protect_critical_slugs_trigger')
          .eq('tgrelid', '(SELECT oid FROM pg_class WHERE relname = \'courses\')');
        return { error };
      });
      
      if (error) {
        return NextResponse.json({ 
          success: false, 
          message: 'Could not disable protection',
          error 
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Slug protection disabled. You can now update slugs freely.' 
      });
      
    } else if (action === 'enable') {
      // Re-create the protective trigger
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TRIGGER protect_critical_slugs_trigger
          BEFORE UPDATE ON public.courses
          FOR EACH ROW
          EXECUTE FUNCTION public.protect_critical_slugs();
        `
      }).single();
      
      if (error) {
        return NextResponse.json({ 
          success: false, 
          message: 'Could not enable protection',
          error 
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Slug protection re-enabled.' 
      });
      
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "disable" or "enable"' 
      }, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with {action: "disable"} to remove slug protection, or {action: "enable"} to restore it.',
    warning: 'Disabling protection allows slugs to be changed, which may break the cart if incorrect slugs are saved.'
  });
}
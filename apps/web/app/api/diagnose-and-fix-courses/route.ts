import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const supabase = getSupabaseServerAdminClient();
  
  try {
    // 1. Check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'courses')
      .order('ordinal_position');
    
    // 2. Check for triggers
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('event_object_schema', 'public')
      .eq('event_object_table', 'courses');
    
    // 3. Check constraints
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'courses');
    
    // 4. Get current courses
    const { data: currentCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, slug, status, account_id')
      .order('title');
    
    // 5. Identify issues
    const issues = [];
    const coursesToFix = [];
    
    if (currentCourses) {
      // Check DOT HAZMAT courses
      const dotHazmatGeneral = currentCourses.find(c => 
        c.title?.includes('DOT HAZMAT') && c.title?.includes('General')
      );
      if (dotHazmatGeneral && dotHazmatGeneral.slug !== 'dot-hazmat-general') {
        issues.push(`DOT HAZMAT General has wrong slug: ${dotHazmatGeneral.slug}`);
        coursesToFix.push({
          id: dotHazmatGeneral.id,
          title: dotHazmatGeneral.title,
          currentSlug: dotHazmatGeneral.slug,
          targetSlug: 'dot-hazmat-general',
          reason: 'Frontend expects dot-hazmat-general'
        });
      }
      
      // Check for dot-hazmat-3
      const dotHazmat3 = currentCourses.find(c => c.slug === 'dot-hazmat-3');
      if (dotHazmat3) {
        issues.push(`Found dot-hazmat-3 which should be dot-hazmat`);
        coursesToFix.push({
          id: dotHazmat3.id,
          title: dotHazmat3.title,
          currentSlug: dotHazmat3.slug,
          targetSlug: 'dot-hazmat',
          reason: 'Frontend expects dot-hazmat'
        });
      }
      
      // Check Advanced HAZMAT
      const advancedHazmat = currentCourses.find(c => 
        c.title?.includes('Advanced') && c.title?.includes('HAZMAT')
      );
      if (advancedHazmat && advancedHazmat.slug !== 'advanced-hazmat') {
        issues.push(`Advanced HAZMAT has wrong slug: ${advancedHazmat.slug}`);
        coursesToFix.push({
          id: advancedHazmat.id,
          title: advancedHazmat.title,
          currentSlug: advancedHazmat.slug,
          targetSlug: 'advanced-hazmat',
          reason: 'Frontend expects advanced-hazmat'
        });
      }
      
      // Check EPA RCRA
      const epaRcra = currentCourses.find(c => 
        c.title?.includes('EPA') && c.title?.includes('RCRA')
      );
      if (epaRcra) {
        if (epaRcra.slug !== 'epa-rcra') {
          issues.push(`EPA RCRA has wrong slug: ${epaRcra.slug}`);
          coursesToFix.push({
            id: epaRcra.id,
            title: epaRcra.title,
            currentSlug: epaRcra.slug,
            targetSlug: 'epa-rcra',
            reason: 'Frontend expects epa-rcra'
          });
        }
        if (epaRcra.status !== 'published') {
          issues.push(`EPA RCRA is not published: ${epaRcra.status}`);
        }
      }
    }
    
    return NextResponse.json({
      diagnosis: {
        tableStructure: tableInfo || 'Could not fetch',
        tableError,
        triggers: triggers || [],
        triggerError,
        constraints: constraints || [],
        constraintError,
        currentCourses: currentCourses?.map(c => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          status: c.status
        })),
        coursesError,
        issues,
        coursesToFix
      },
      fixAvailable: coursesToFix.length > 0,
      message: coursesToFix.length > 0 
        ? 'Issues found. Send POST request to apply fixes.' 
        : 'No slug issues found.'
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function POST() {
  const supabase = getSupabaseServerAdminClient();
  
  try {
    // Define all the fixes we need
    const fixes = [
      {
        name: 'Fix DOT HAZMAT General slug',
        query: `
          UPDATE public.courses 
          SET slug = 'dot-hazmat-general',
              updated_at = NOW()
          WHERE title ILIKE '%DOT HAZMAT%General%'
            AND slug != 'dot-hazmat-general'
        `
      },
      {
        name: 'Fix DOT HAZMAT 3 to dot-hazmat',
        query: `
          UPDATE public.courses 
          SET slug = 'dot-hazmat',
              updated_at = NOW()
          WHERE slug = 'dot-hazmat-3'
        `
      },
      {
        name: 'Fix Advanced HAZMAT slug',
        query: `
          UPDATE public.courses 
          SET slug = 'advanced-hazmat',
              updated_at = NOW()
          WHERE title ILIKE '%Advanced%HAZMAT%'
            AND slug != 'advanced-hazmat'
        `
      },
      {
        name: 'Fix EPA RCRA slug',
        query: `
          UPDATE public.courses 
          SET slug = 'epa-rcra',
              updated_at = NOW()
          WHERE title ILIKE '%EPA%RCRA%'
            AND slug != 'epa-rcra'
        `
      },
      {
        name: 'Publish EPA RCRA',
        query: `
          UPDATE public.courses 
          SET status = 'published',
              updated_at = NOW()
          WHERE slug = 'epa-rcra'
            AND status != 'published'
        `
      }
    ];
    
    // Execute all fixes
    const results = [];
    for (const fix of fixes) {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: fix.query
      }).select();
      
      // If RPC doesn't exist, try direct update
      if (error?.message?.includes('execute_sql')) {
        // Parse the query to extract the condition and update
        if (fix.name.includes('DOT HAZMAT General')) {
          const { data, error } = await supabase
            .from('courses')
            .update({ slug: 'dot-hazmat-general', updated_at: new Date().toISOString() })
            .ilike('title', '%DOT HAZMAT%General%')
            .neq('slug', 'dot-hazmat-general')
            .select();
          results.push({ fix: fix.name, success: !error, data, error });
        } else if (fix.name.includes('dot-hazmat-3')) {
          const { data, error } = await supabase
            .from('courses')
            .update({ slug: 'dot-hazmat', updated_at: new Date().toISOString() })
            .eq('slug', 'dot-hazmat-3')
            .select();
          results.push({ fix: fix.name, success: !error, data, error });
        } else if (fix.name.includes('Advanced HAZMAT')) {
          const { data, error } = await supabase
            .from('courses')
            .update({ slug: 'advanced-hazmat', updated_at: new Date().toISOString() })
            .ilike('title', '%Advanced%HAZMAT%')
            .neq('slug', 'advanced-hazmat')
            .select();
          results.push({ fix: fix.name, success: !error, data, error });
        } else if (fix.name.includes('EPA RCRA slug')) {
          const { data, error } = await supabase
            .from('courses')
            .update({ slug: 'epa-rcra', updated_at: new Date().toISOString() })
            .ilike('title', '%EPA%RCRA%')
            .neq('slug', 'epa-rcra')
            .select();
          results.push({ fix: fix.name, success: !error, data, error });
        } else if (fix.name.includes('Publish EPA')) {
          const { data, error } = await supabase
            .from('courses')
            .update({ status: 'published', updated_at: new Date().toISOString() })
            .eq('slug', 'epa-rcra')
            .neq('status', 'published')
            .select();
          results.push({ fix: fix.name, success: !error, data, error });
        }
      } else {
        results.push({ fix: fix.name, success: !error, data, error });
      }
    }
    
    // Verify the fixes
    const { data: verifiedCourses } = await supabase
      .from('courses')
      .select('id, title, slug, status')
      .in('slug', ['dot-hazmat', 'dot-hazmat-general', 'advanced-hazmat', 'epa-rcra'])
      .order('title');
    
    return NextResponse.json({
      message: 'Fixes applied',
      results,
      verifiedCourses,
      cartShouldWorkNow: true
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
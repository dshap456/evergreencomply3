import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

const requestSchema = z.object({
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .transform((value) => value.trim().toLowerCase()),
  source: z.string().min(1).max(120).default('dot-hazmat-crosswalk'),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { email, source } = requestSchema.parse(json);

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('lead_magnet_signups')
      .upsert(
        { email, source_slug: source },
        { onConflict: 'email,source_slug' }
      );

    if (error) {
      console.error('lead-magnet signup insert error', error);
      return NextResponse.json(
        { success: false, error: 'Unable to save your request right now. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, downloadUrl: '/resources/dot-hazmat-crosswalk.pdf' });
  } catch (error) {
    console.error('lead-magnet signup error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message ?? 'Invalid input.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Unexpected error.' }, { status: 500 });
  }
}

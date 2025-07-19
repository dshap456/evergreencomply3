'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const LoadVideoDataSchema = z.object({
  lessonId: z.string().uuid(),
  languageCode: z.string().default('en'),
});

export const loadVideoDataAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    console.log('🔍 LoadVideoDataAction: Loading video data for lesson:', data.lessonId);

    // Load lesson data using admin client
    const { data: lessonData, error: lessonError } = await client
      .from('lessons')
      .select('*')
      .eq('id', data.lessonId)
      .single();

    if (lessonError) {
      console.error('❌ LoadVideoDataAction: Error loading lesson:', lessonError);
      throw new Error(`Failed to load lesson: ${lessonError.message}`);
    }

    console.log('📊 LoadVideoDataAction: Lesson data loaded:', {
      id: lessonData.id,
      title: lessonData.title,
      video_url: lessonData.video_url ? 'present' : 'missing',
      video_metadata_id: lessonData.video_metadata_id ? 'present' : 'missing'
    });

    // Load video metadata using admin client
    const { data: metadataData, error: metadataError } = await client
      .from('video_metadata')
      .select('*')
      .eq('lesson_id', data.lessonId)
      .eq('language_code', data.languageCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (metadataError) {
      console.error('❌ LoadVideoDataAction: Error loading video metadata:', metadataError);
      throw new Error(`Failed to load video metadata: ${metadataError.message}`);
    }

    console.log('📊 LoadVideoDataAction: Video metadata loaded:', {
      hasMetadata: !!metadataData,
      filename: metadataData?.original_filename,
      status: metadataData?.processing_status
    });

    return {
      lesson: lessonData,
      videoMetadata: metadataData,
    };
  },
  {
    auth: true,
    schema: LoadVideoDataSchema,
  }
);
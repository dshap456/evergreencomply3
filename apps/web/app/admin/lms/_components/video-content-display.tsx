'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';

interface VideoContentDisplayProps {
  lessonId: string;
  languageCode?: 'en' | 'es';
}

export function VideoContentDisplay({ lessonId, languageCode = 'en' }: VideoContentDisplayProps) {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [videoMetadata, setVideoMetadata] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);

  useEffect(() => {
    async function loadVideoData() {
      try {
        // Load lesson data
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();

        if (lessonError) {
          console.error('Error loading lesson:', lessonError);
          return;
        }

        setLesson(lessonData);

        // Load video metadata
        const { data: metadataData, error: metadataError } = await supabase
          .from('video_metadata')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('language_code', languageCode)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (metadataError) {
          console.error('Error loading video metadata:', metadataError);
          return;
        }

        setVideoMetadata(metadataData);
      } finally {
        setLoading(false);
      }
    }

    loadVideoData();
  }, [lessonId, languageCode, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (!lesson?.video_url && !videoMetadata) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Current Video</h4>
            {videoMetadata?.processing_status && (
              <Badge variant={
                videoMetadata.processing_status === 'ready' ? 'default' :
                videoMetadata.processing_status === 'processing' ? 'secondary' :
                videoMetadata.processing_status === 'error' ? 'destructive' :
                'outline'
              }>
                {videoMetadata.processing_status}
              </Badge>
            )}
          </div>

          {videoMetadata && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>File: {videoMetadata.original_filename}</p>
              <p>Size: {formatFileSize(videoMetadata.file_size)}</p>
              {videoMetadata.duration && <p>Duration: {formatDuration(videoMetadata.duration)}</p>}
              {videoMetadata.quality && <p>Quality: {videoMetadata.quality}</p>}
              <p>Uploaded: {new Date(videoMetadata.created_at).toLocaleString()}</p>
            </div>
          )}

          {lesson?.video_url && (
            <div className="text-sm text-muted-foreground">
              <p className="break-all">Storage path: {lesson.video_url}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
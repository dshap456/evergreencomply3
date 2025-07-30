'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';

import { loadVideoDataAction } from '../_lib/server/video-actions';

interface VideoContentDisplayProps {
  lessonId: string;
  languageCode?: 'en' | 'es';
}

export function VideoContentDisplay({ lessonId, languageCode = 'en' }: VideoContentDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);

  useEffect(() => {
    async function loadVideoData() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('VideoContentDisplay: Loading video data using server action for lesson:', lessonId);

        const result = await loadVideoDataAction({
          lessonId,
          languageCode,
        });

        console.log('VideoContentDisplay: Video data loaded successfully:', {
          hasLesson: !!result.lesson,
          hasVideoMetadata: !!result.videoMetadata,
          video_url: result.lesson?.video_url ? 'present' : 'missing'
        });

        setLesson(result.lesson);
        setVideoMetadata(result.videoMetadata);
      } catch (err) {
        console.error('VideoContentDisplay: Failed to load video data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video data');
      } finally {
        setLoading(false);
      }
    }

    loadVideoData();
  }, [lessonId, languageCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="text-center text-destructive py-4">
            <p>Error loading video data</p>
            <p className="text-xs">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lesson?.video_url && !videoMetadata) {
    console.log('ℹ️ VideoContentDisplay: No video content found for lesson:', lessonId);
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-4">
            <p>No video uploaded yet</p>
            <p className="text-xs">Upload a video using the form below</p>
          </div>
        </CardContent>
      </Card>
    );
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
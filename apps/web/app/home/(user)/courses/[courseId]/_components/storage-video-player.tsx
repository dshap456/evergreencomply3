'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@kit/ui/spinner';
import { VideoPlayer } from './video-player';

interface StorageVideoPlayerProps {
  lessonId: string;
  onProgress: (progress: number) => void;
  onCompletion: (completed: boolean) => void;
}

export function StorageVideoPlayer({ lessonId, onProgress, onCompletion }: StorageVideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [status, setStatus] = useState<string>('unknown');

  useEffect(() => {
    async function loadVideoUrl() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🎥 Loading video for lesson:', lessonId);

        const response = await fetch(`/api/video/secure-url/${lessonId}`);
        const result = await response.json();
        
        console.log('🔍 Video API response:', result);

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load video');
        }

        setHasVideo(result.has_video);
        setStatus(result.status || 'unknown');

        if (result.video_url) {
          console.log('✅ Got video URL:', result.video_url.substring(0, 50) + '...');
          setVideoUrl(result.video_url);
        } else if (result.has_video && result.status === 'pending') {
          setError('Video is still processing. Please try again in a few minutes.');
        } else if (!result.has_video) {
          setError('No video has been uploaded for this lesson yet.');
        } else {
          setError('Video is not available.');
        }

      } catch (err) {
        console.error('Error loading video URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    }

    if (lessonId) {
      loadVideoUrl();
    }
  }, [lessonId]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <Spinner className="mx-auto mb-4 h-8 w-8" />
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white max-w-md px-4">
          <div className="text-4xl mb-4">🎥</div>
          <h3 className="text-lg font-semibold mb-2">Video Not Available</h3>
          <p className="text-gray-300 text-sm mb-4">{error}</p>
          {hasVideo && status === 'pending' && (
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="text-4xl mb-4">🎥</div>
          <h3 className="text-lg font-semibold mb-2">No Video Content</h3>
          <p className="text-gray-300 text-sm">This lesson doesn't have a video yet.</p>
        </div>
      </div>
    );
  }

  return (
    <VideoPlayer 
      src={videoUrl}
      isPlaceholder={false}
      onProgress={onProgress}
      onCompletion={onCompletion}
    />
  );
}
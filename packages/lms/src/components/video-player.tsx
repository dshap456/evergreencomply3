'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

import { Button } from '@kit/ui/button';
import { Progress } from '@kit/ui/shadcn/progress';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

interface VideoPlayerProps {
  lessonId: string;
  courseId: string;
  title: string;
  languageCode?: 'en' | 'es';
  onProgress?: (currentTime: number, duration: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
  className?: string;
}

interface VideoMetadata {
  id: string;
  storage_path: string;
  duration: number;
  thumbnail_path?: string;
  width?: number;
  height?: number;
}

export function VideoPlayer({
  lessonId,
  courseId,
  title,
  languageCode = 'en',
  onProgress,
  onComplete,
  autoPlay = false,
  className = ''
}: VideoPlayerProps) {
  const supabase = useSupabase();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);

  // Load video data and URLs
  const loadVideo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get video metadata and secure URL
      const { data: videoPath, error: urlError } = await supabase.rpc(
        'get_secure_video_url',
        {
          p_lesson_id: lessonId,
          p_language_code: languageCode
        }
      );

      if (urlError) {
        throw new Error(`Failed to get video URL: ${urlError.message}`);
      }

      if (!videoPath) {
        throw new Error('Video not available or not accessible');
      }

      // Get video metadata
      const { data: metadataResult, error: metadataError } = await supabase
        .from('video_metadata')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('language_code', languageCode)
        .eq('processing_status', 'ready')
        .single();

      if (metadataError) {
        console.warn('Could not load video metadata:', metadataError);
      } else {
        setMetadata(metadataResult);
      }

      // Create signed URLs for video and thumbnail
      const { data: videoSignedUrl } = await supabase.storage
        .from('course-videos')
        .createSignedUrl(videoPath, 3600); // 1 hour expiry

      if (videoSignedUrl?.signedUrl) {
        setVideoUrl(videoSignedUrl.signedUrl);
      } else {
        throw new Error('Failed to create signed URL for video');
      }

      // Load thumbnail if available
      if (metadataResult?.thumbnail_path) {
        const { data: thumbnailSignedUrl } = await supabase.storage
          .from('video-thumbnails')
          .createSignedUrl(metadataResult.thumbnail_path, 3600);
        
        if (thumbnailSignedUrl?.signedUrl) {
          setThumbnailUrl(thumbnailSignedUrl.signedUrl);
        }
      }

      // Load existing progress
      const { data: progressData } = await supabase
        .from('video_progress')
        .select('current_time, duration')
        .eq('lesson_id', lessonId)
        .single();

      if (progressData?.current_time) {
        setCurrentTime(progressData.current_time);
        setLastSavedProgress(progressData.current_time);
      }

    } catch (err) {
      console.error('Error loading video:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [lessonId, languageCode, supabase]);

  // Save progress to database
  const saveProgress = useCallback(async (time: number, videoDuration: number) => {
    // Only save if progress has changed significantly (>5 seconds)
    if (Math.abs(time - lastSavedProgress) < 5) return;

    try {
      const { error } = await supabase.rpc('update_video_progress', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_lesson_id: lessonId,
        p_current_time: Math.floor(time),
        p_duration: Math.floor(videoDuration),
        p_device_info: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

      if (!error) {
        setLastSavedProgress(time);
      }
    } catch (err) {
      console.warn('Failed to save video progress:', err);
    }
  }, [lessonId, supabase, lastSavedProgress]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      
      // Restore progress
      if (currentTime > 0 && currentTime < videoDuration - 10) {
        videoRef.current.currentTime = currentTime;
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      const videoDuration = videoRef.current.duration;
      
      setCurrentTime(time);
      
      // Call progress callback
      onProgress?.(time, videoDuration);
      
      // Save progress periodically
      if (hasStarted) {
        saveProgress(time, videoDuration);
      }
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setHasStarted(true);
    
    // Start progress tracking interval
    progressIntervalRef.current = setInterval(() => {
      handleTimeUpdate();
    }, 1000);
  };

  const handlePause = () => {
    setIsPlaying(false);
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Save current progress
    if (videoRef.current) {
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    
    // Mark as completed if watched to the end
    if (videoRef.current) {
      const watchedPercentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      if (watchedPercentage >= 90) { // Consider 90%+ as complete
        onComplete?.();
      }
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleSeek = (seekTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  // Load video on mount
  useEffect(() => {
    loadVideo();
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [loadVideo]);

  // Auto-play if enabled
  useEffect(() => {
    if (videoUrl && autoPlay && videoRef.current) {
      videoRef.current.play().catch(console.warn);
    }
  }, [videoUrl, autoPlay]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg h-64 ${className}`}>
        <div className="text-center p-4">
          <p className="text-red-600 mb-2">⚠️ Video Error</p>
          <p className="text-sm text-red-500">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadVideo}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-auto"
        poster={thumbnailUrl || undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        controls={false} // Custom controls
        preload="metadata"
      >
        {videoUrl && (
          <source src={videoUrl} type="video/mp4" />
        )}
        <p>Your browser does not support the video tag.</p>
      </video>

      {/* Custom Controls Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-20">
        <Button
          variant="secondary"
          size="lg"
          onClick={togglePlayPause}
          className="bg-white bg-opacity-90 hover:bg-opacity-100"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-center gap-2 text-white text-sm">
          <span>{formatTime(currentTime)}</span>
          <Progress 
            value={progressPercentage} 
            className="flex-1 h-2 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const seekTime = (clickX / rect.width) * duration;
              handleSeek(seekTime);
            }}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Video Title */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent">
        <h3 className="text-white font-medium">{title}</h3>
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
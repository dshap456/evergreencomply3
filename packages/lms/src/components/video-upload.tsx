'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@kit/ui/button';
import { Progress } from '@kit/ui/progress';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

interface VideoUploadProps {
  lessonId: string;
  courseId: string;
  accountId: string;
  languageCode?: 'en' | 'es';
  onUploadComplete?: (videoMetadataId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadProgress {
  percentage: number;
  phase: 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
}

export function VideoUpload({
  lessonId,
  courseId,
  accountId,
  languageCode = 'en',
  onUploadComplete,
  onUploadError,
  className = ''
}: VideoUploadProps) {
  const supabase = useSupabase();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    percentage: 0,
    phase: 'uploading',
    message: ''
  });
  const [error, setError] = useState<string | null>(null);

  const uploadVideo = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setProgress({
        percentage: 0,
        phase: 'uploading',
        message: 'Preparing upload...'
      });

      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error('Please select a valid video file');
      }

      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        throw new Error('Video file must be smaller than 500MB');
      }

      // Generate storage path
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const timestamp = Date.now();
      const storagePath = `${accountId}/${courseId}/${lessonId}/${timestamp}.${fileExtension}`;

      setProgress({
        percentage: 10,
        phase: 'uploading',
        message: 'Uploading video file...'
      });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            lessonId,
            courseId,
            accountId,
            originalName: file.name,
            fileSize: file.size.toString()
          }
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress({
        percentage: 60,
        phase: 'uploading',
        message: 'Upload complete, creating metadata...'
      });

      // Create video metadata record
      const { data: metadataData, error: metadataError } = await supabase.rpc(
        'create_video_metadata',
        {
          p_lesson_id: lessonId,
          p_language_code: languageCode,
          p_storage_path: storagePath,
          p_original_filename: file.name,
          p_file_size: file.size,
          p_quality: '720p' // Default quality
        }
      );

      if (metadataError) {
        throw new Error(`Failed to create metadata: ${metadataError.message}`);
      }

      setProgress({
        percentage: 80,
        phase: 'processing',
        message: 'Video uploaded successfully! Processing thumbnail...'
      });

      // Update lesson with video URL
      const { error: lessonUpdateError } = await supabase
        .from('lessons')
        .update({
          video_url: storagePath,
          content_type: 'video',
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonId);

      if (lessonUpdateError) {
        console.warn('Failed to update lesson video URL:', lessonUpdateError);
      }

      setProgress({
        percentage: 100,
        phase: 'complete',
        message: 'Video upload complete!'
      });

      // Notify parent component
      onUploadComplete?.(metadataData);

      // Reset after delay
      setTimeout(() => {
        setUploading(false);
        setProgress({
          percentage: 0,
          phase: 'uploading',
          message: ''
        });
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setProgress({
        percentage: 0,
        phase: 'error',
        message: errorMessage
      });
      onUploadError?.(errorMessage);
      setUploading(false);
    }
  }, [lessonId, courseId, accountId, languageCode, supabase, onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv']
    },
    maxFiles: 1,
    disabled: uploading,
    onDrop: (files) => {
      if (files.length > 0) {
        uploadVideo(files[0]);
      }
    }
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : uploading 
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-3">
            <div className="text-2xl">🎬</div>
            <p className="text-gray-600 font-medium">{progress.message}</p>
            <Progress value={progress.percentage} className="w-full max-w-xs mx-auto" />
            <p className="text-sm text-gray-500">{progress.percentage}% complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl">📹</div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? 'Drop video here...' : 'Upload Video'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop a video file here, or click to select
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supported formats: MP4, WebM, OGG, AVI, MOV (max 500MB)
              </p>
            </div>
          </div>
        )}
      </div>


      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Instructions */}
      {!uploading && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Videos will be automatically processed and optimized</p>
          <p>• Thumbnails will be generated automatically</p>
          <p>• Students will see videos based on their language preference</p>
          <p>• Large files may take several minutes to process</p>
        </div>
      )}
    </div>
  );
}

// Progress indicator component for video processing status
export function VideoProcessingStatus({ 
  videoMetadataId, 
  className = '' 
}: { 
  videoMetadataId: string;
  className?: string;
}) {
  const supabase = useSupabase();
  const [status, setStatus] = useState<{
    processing_status: string;
    processing_error?: string;
  } | null>(null);

  // Poll for processing status
  useState(() => {
    const checkStatus = async () => {
      const { data } = await supabase
        .from('video_metadata')
        .select('processing_status, processing_error')
        .eq('id', videoMetadataId)
        .single();
      
      if (data) {
        setStatus(data);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  });

  if (!status) return null;

  const getStatusDisplay = () => {
    switch (status.processing_status) {
      case 'pending':
        return { icon: '⏳', text: 'Queued for processing', color: 'text-yellow-600' };
      case 'processing':
        return { icon: '⚙️', text: 'Processing video', color: 'text-blue-600' };
      case 'ready':
        return { icon: '✅', text: 'Ready to view', color: 'text-green-600' };
      case 'error':
        return { icon: '❌', text: 'Processing failed', color: 'text-red-600' };
      default:
        return { icon: '❓', text: 'Unknown status', color: 'text-gray-600' };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span>{display.icon}</span>
      <span className={display.color}>{display.text}</span>
      {status.processing_error && (
        <span className="text-red-500 text-xs">({status.processing_error})</span>
      )}
    </div>
  );
}
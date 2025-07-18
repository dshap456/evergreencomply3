import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@kit/supabase/database';

export type VideoMetadata = Database['public']['Tables']['video_metadata']['Row'];
export type VideoProgress = Database['public']['Tables']['video_progress']['Row'];
export type VideoAccessLog = Database['public']['Tables']['video_access_logs']['Row'];

export interface VideoPlayerConfig {
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  poster?: string;
  preload?: 'none' | 'metadata' | 'auto';
}

export interface VideoUploadOptions {
  quality?: string;
  generateThumbnail?: boolean;
  overwrite?: boolean;
}

/**
 * Video Management API for LMS
 */
export class VideoService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get secure video URL for a lesson
   */
  async getVideoUrl(
    lessonId: string,
    languageCode: 'en' | 'es' = 'en',
    quality?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_secure_video_url', {
        p_lesson_id: lessonId,
        p_language_code: languageCode,
        p_quality: quality || null
      });

      if (error) {
        console.error('Error getting video URL:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Create signed URL
      const { data: signedUrlData } = await this.supabase.storage
        .from('course-videos')
        .createSignedUrl(data, 3600); // 1 hour expiry

      return signedUrlData?.signedUrl || null;
    } catch (error) {
      console.error('Failed to get video URL:', error);
      return null;
    }
  }

  /**
   * Get video metadata for a lesson
   */
  async getVideoMetadata(
    lessonId: string,
    languageCode: 'en' | 'es' = 'en'
  ): Promise<VideoMetadata | null> {
    try {
      const { data, error } = await this.supabase
        .from('video_metadata')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('language_code', languageCode)
        .eq('processing_status', 'ready')
        .single();

      if (error) {
        console.error('Error getting video metadata:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get video metadata:', error);
      return null;
    }
  }

  /**
   * Update video progress for cross-device sync
   */
  async updateProgress(
    lessonId: string,
    currentTime: number,
    duration: number,
    deviceInfo?: any
  ): Promise<boolean> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await this.supabase.rpc('update_video_progress', {
        p_user_id: user.data.user.id,
        p_lesson_id: lessonId,
        p_current_time: Math.floor(currentTime),
        p_duration: Math.floor(duration),
        p_device_info: deviceInfo || null
      });

      if (error) {
        console.error('Error updating video progress:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update video progress:', error);
      return false;
    }
  }

  /**
   * Get user's video progress for a lesson
   */
  async getProgress(lessonId: string): Promise<VideoProgress | null> {
    try {
      const { data, error } = await this.supabase
        .from('video_progress')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        console.error('Error getting video progress:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get video progress:', error);
      return null;
    }
  }

  /**
   * Upload video file and create metadata
   */
  async uploadVideo(
    file: File,
    lessonId: string,
    courseId: string,
    accountId: string,
    languageCode: 'en' | 'es' = 'en',
    options: VideoUploadOptions = {}
  ): Promise<{ success: boolean; videoMetadataId?: string; error?: string }> {
    try {
      // Validate file
      if (!file.type.startsWith('video/')) {
        return { success: false, error: 'Invalid file type. Please upload a video file.' };
      }

      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        return { success: false, error: 'File too large. Maximum size is 500MB.' };
      }

      // Generate unique storage path
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const timestamp = Date.now();
      const storagePath = `${accountId}/${courseId}/${lessonId}/${languageCode}/${timestamp}.${fileExtension}`;

      // Upload to storage
      const { error: uploadError } = await this.supabase.storage
        .from('course-videos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: options.overwrite || false
        });

      if (uploadError) {
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

      // Create metadata record
      const { data: videoMetadata, error: metadataError } = await this.supabase.rpc(
        'create_video_metadata',
        {
          p_lesson_id: lessonId,
          p_language_code: languageCode,
          p_storage_path: storagePath,
          p_original_filename: file.name,
          p_file_size: file.size,
          p_quality: options.quality || '720p'
        }
      );

      if (metadataError) {
        return { success: false, error: `Failed to create metadata: ${metadataError.message}` };
      }

      return { success: true, videoMetadataId: videoMetadata };
    } catch (error) {
      console.error('Video upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Delete video and its metadata
   */
  async deleteVideo(videoMetadataId: string): Promise<boolean> {
    try {
      // Get video metadata first
      const { data: metadata, error: metadataError } = await this.supabase
        .from('video_metadata')
        .select('storage_path, thumbnail_path')
        .eq('id', videoMetadataId)
        .single();

      if (metadataError) {
        console.error('Error getting video metadata for deletion:', metadataError);
        return false;
      }

      // Delete video file from storage
      if (metadata.storage_path) {
        const { error: videoDeleteError } = await this.supabase.storage
          .from('course-videos')
          .remove([metadata.storage_path]);

        if (videoDeleteError) {
          console.warn('Failed to delete video file:', videoDeleteError);
        }
      }

      // Delete thumbnail file from storage
      if (metadata.thumbnail_path) {
        const { error: thumbnailDeleteError } = await this.supabase.storage
          .from('video-thumbnails')
          .remove([metadata.thumbnail_path]);

        if (thumbnailDeleteError) {
          console.warn('Failed to delete thumbnail file:', thumbnailDeleteError);
        }
      }

      // Delete metadata record (cascades to other related records)
      const { error: deleteError } = await this.supabase
        .from('video_metadata')
        .delete()
        .eq('id', videoMetadataId);

      if (deleteError) {
        console.error('Error deleting video metadata:', deleteError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete video:', error);
      return false;
    }
  }

  /**
   * Get video analytics for a course or lesson
   */
  async getVideoAnalytics(courseId?: string, lessonId?: string) {
    try {
      let query = this.supabase.from('video_analytics').select('*');

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting video analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get video analytics:', error);
      return null;
    }
  }

  /**
   * Get video management dashboard data
   */
  async getVideoDashboard(accountId: string) {
    try {
      const { data, error } = await this.supabase
        .from('video_management_dashboard')
        .select('*')
        .eq('account_id', accountId);

      if (error) {
        console.error('Error getting video dashboard:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get video dashboard:', error);
      return null;
    }
  }
}

/**
 * Video utility functions
 */
export const videoUtils = {
  /**
   * Format duration in seconds to human readable format
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  /**
   * Format file size in bytes to human readable format
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Get video quality label
   */
  getQualityLabel(quality: string): string {
    const qualityMap: Record<string, string> = {
      '1080p': 'Full HD (1080p)',
      '720p': 'HD (720p)',
      '480p': 'SD (480p)',
      '360p': 'Low (360p)'
    };
    return qualityMap[quality] || quality;
  },

  /**
   * Calculate watched percentage
   */
  calculateWatchedPercentage(currentTime: number, duration: number): number {
    if (duration <= 0) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  },

  /**
   * Check if video is considered "completed" (watched >= 90%)
   */
  isVideoCompleted(currentTime: number, duration: number): boolean {
    return this.calculateWatchedPercentage(currentTime, duration) >= 90;
  },

  /**
   * Generate thumbnail URL for video
   */
  async getThumbnailUrl(
    supabase: SupabaseClient<Database>,
    thumbnailPath: string
  ): Promise<string | null> {
    if (!thumbnailPath) return null;

    try {
      const { data } = await supabase.storage
        .from('video-thumbnails')
        .createSignedUrl(thumbnailPath, 3600);

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Failed to get thumbnail URL:', error);
      return null;
    }
  }
};

/**
 * Video player event handlers
 */
export const videoEventHandlers = {
  /**
   * Handle video time update with throttling
   */
  createTimeUpdateHandler(
    onProgress: (currentTime: number, duration: number) => void,
    throttleMs: number = 1000
  ) {
    let lastUpdate = 0;
    
    return (event: Event) => {
      const video = event.target as HTMLVideoElement;
      const now = Date.now();
      
      if (now - lastUpdate >= throttleMs) {
        onProgress(video.currentTime, video.duration);
        lastUpdate = now;
      }
    };
  },

  /**
   * Handle video completion with customizable threshold
   */
  createCompletionHandler(
    onComplete: () => void,
    completionThreshold: number = 0.9
  ) {
    return (event: Event) => {
      const video = event.target as HTMLVideoElement;
      const watchedPercentage = video.currentTime / video.duration;
      
      if (watchedPercentage >= completionThreshold) {
        onComplete();
      }
    };
  }
};
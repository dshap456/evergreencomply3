'use client';

import { useState, useRef } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Progress } from '@kit/ui/progress';
import { Spinner } from '@kit/ui/spinner';
import { toast } from '@kit/ui/sonner';
import { Upload, Video, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

interface VideoUploadProps {
  lessonId: string;
  onVideoUploaded: (videoMetadata: any) => void;
  existingVideo?: {
    id: string;
    original_filename: string;
    file_size: number;
    duration?: number;
    processing_status: string;
  };
}

export function VideoUpload({ lessonId, onVideoUploaded, existingVideo }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useSupabase();

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid video file (MP4, WebM, OGG, AVI, or MOV)');
      return;
    }

    // Validate file size (500MB max)
    const maxSize = 524288000; // 500MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 500MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const uploadVideo = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `${lessonId}/${timestamp}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(fileName, selectedFile, {
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create video metadata record
      const response = await fetch('/api/admin/video/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          storage_path: fileName,
          original_filename: selectedFile.name,
          file_size: selectedFile.size,
          language_code: 'en',
          quality: '720p'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create video metadata');
      }

      const result = await response.json();
      
      toast.success('Video uploaded successfully!');
      onVideoUploaded(result.metadata);
      setSelectedFile(null);
      setUploadProgress(0);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProcessingStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Spinner className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Video className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProcessingStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Video Content</div>

      {/* Existing Video Display */}
      {existingVideo && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center gap-3">
            {getProcessingStatusIcon(existingVideo.processing_status)}
            <div className="flex-1">
              <div className="font-medium text-sm">{existingVideo.original_filename}</div>
              <div className="text-xs text-gray-500">
                {formatFileSize(existingVideo.file_size)} • 
                {existingVideo.duration ? ` ${Math.floor(existingVideo.duration / 60)}:${(existingVideo.duration % 60).toString().padStart(2, '0')} • ` : ' '}
                {getProcessingStatusText(existingVideo.processing_status)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
            >
              Replace
            </Button>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      {!existingVideo && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Video className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <div className="text-sm text-gray-600">
                    Uploading... {uploadProgress}%
                  </div>
                </div>
              )}

              <Button
                onClick={uploadVideo}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Video
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-gray-400" />
                <div>
                  <div className="font-medium">Upload video file</div>
                  <div className="text-sm text-gray-500">
                    Drag and drop or click to select
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                Supported formats: MP4, WebM, OGG, AVI, MOV • Max size: 500MB
              </div>

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Select File
              </Button>

              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
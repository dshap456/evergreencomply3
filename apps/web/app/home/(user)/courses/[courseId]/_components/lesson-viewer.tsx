'use client';

import { useState, useEffect } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
import { Trans } from '@kit/ui/trans';
import { CheckCircle, Lock, Play, Download, FileText } from 'lucide-react';

import type { CourseLesson } from '../_lib/server/learner-course-details.loader';

interface LessonViewerProps {
  lesson: CourseLesson;
  isUnlocked: boolean;
  onLessonComplete: (lessonId: string, progress: number) => void;
  onProgressUpdate: (lessonId: string, progress: number) => void;
}

export function LessonViewer({ 
  lesson, 
  isUnlocked, 
  onLessonComplete, 
  onProgressUpdate 
}: LessonViewerProps) {
  const [progress, setProgress] = useState(lesson.completed ? 100 : 0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Determine completion requirements based on content type
  const getCompletionThreshold = () => {
    switch (lesson.content_type) {
      case 'video': return 95;
      case 'quiz': return 80;
      case 'asset': return 100;
      default: return 100;
    }
  };

  const isCompleted = progress >= getCompletionThreshold();
  const canComplete = isUnlocked && !lesson.completed;

  // Update progress in real-time
  const updateProgress = (newProgress: number) => {
    setProgress(newProgress);
    onProgressUpdate(lesson.id, newProgress);
    
    // Auto-complete if threshold is met
    if (newProgress >= getCompletionThreshold() && !lesson.completed) {
      onLessonComplete(lesson.id, newProgress);
    }
  };

  if (!isUnlocked) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="p-8 text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Lesson Locked</h3>
          <p className="text-muted-foreground">
            Complete the previous lesson to unlock this content
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ContentTypeIcon type={lesson.content_type} />
            <div>
              <CardTitle className="text-xl">{lesson.title}</CardTitle>
              {lesson.description && (
                <p className="text-muted-foreground mt-1">
                  {lesson.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ContentTypeBadge type={lesson.content_type} />
            {lesson.completed && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}% ({getCompletionThreshold()}% required)</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content Viewer */}
        <LessonContentViewer
          lesson={lesson}
          progress={progress}
          onProgressUpdate={updateProgress}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
        />

        {/* Completion Status */}
        {canComplete && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              {isCompleted ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Lesson Complete!</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 border-2 border-blue-300 rounded-full" />
                  <span>
                    {lesson.content_type === 'video' && 'Watch to 95% to complete'}
                    {lesson.content_type === 'quiz' && 'Score 80% or higher to complete'}
                    {lesson.content_type === 'asset' && 'Download to complete'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContentTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'video':
      return <Play className="w-6 h-6 text-blue-600" />;
    case 'quiz':
      return <FileText className="w-6 h-6 text-purple-600" />;
    case 'asset':
      return <Download className="w-6 h-6 text-green-600" />;
    default:
      return <FileText className="w-6 h-6 text-gray-600" />;
  }
}

function ContentTypeBadge({ type }: { type: string }) {
  const configs = {
    video: { color: 'bg-blue-100 text-blue-800', label: 'Video' },
    quiz: { color: 'bg-purple-100 text-purple-800', label: 'Quiz' },
    asset: { color: 'bg-green-100 text-green-800', label: 'Download' },
  };
  
  const config = configs[type as keyof typeof configs] || { color: 'bg-gray-100 text-gray-800', label: 'Content' };
  
  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
}

interface LessonContentViewerProps {
  lesson: CourseLesson;
  progress: number;
  onProgressUpdate: (progress: number) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
}

function LessonContentViewer({ 
  lesson, 
  progress, 
  onProgressUpdate, 
  isPlaying, 
  onPlayingChange 
}: LessonContentViewerProps) {
  switch (lesson.content_type) {
    case 'video':
      return (
        <VideoLessonViewer
          videoUrl={lesson.video_url}
          progress={progress}
          onProgressUpdate={onProgressUpdate}
          isPlaying={isPlaying}
          onPlayingChange={onPlayingChange}
        />
      );
    
    case 'quiz':
      return (
        <QuizLessonViewer
          lesson={lesson}
          progress={progress}
          onProgressUpdate={onProgressUpdate}
        />
      );
    
    case 'asset':
      return (
        <AssetLessonViewer
          assetUrl={lesson.asset_url}
          progress={progress}
          onProgressUpdate={onProgressUpdate}
        />
      );
    
    default:
      return (
        <div className="p-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg">
          <p className="text-muted-foreground">
            Unsupported content type: {lesson.content_type}
          </p>
        </div>
      );
  }
}

function VideoLessonViewer({ 
  videoUrl, 
  progress, 
  onProgressUpdate, 
  isPlaying, 
  onPlayingChange 
}: {
  videoUrl: string | null;
  progress: number;
  onProgressUpdate: (progress: number) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
}) {
  if (!videoUrl) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-red-200 rounded-lg">
        <p className="text-red-600">No video URL provided</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video
          src={videoUrl}
          controls
          className="w-full h-full"
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            const progressPercent = (video.currentTime / video.duration) * 100;
            onProgressUpdate(Math.min(progressPercent, 100));
          }}
          onPlay={() => onPlayingChange(true)}
          onPause={() => onPlayingChange(false)}
          onEnded={() => {
            onProgressUpdate(100);
            onPlayingChange(false);
          }}
        />
      </div>
      
      <div className="text-sm text-muted-foreground text-center">
        Watch at least 95% of the video to complete this lesson
      </div>
    </div>
  );
}

function QuizLessonViewer({ 
  lesson, 
  progress, 
  onProgressUpdate 
}: {
  lesson: CourseLesson;
  progress: number;
  onProgressUpdate: (progress: number) => void;
}) {
  // Placeholder for quiz functionality
  return (
    <div className="space-y-4">
      <div className="p-8 text-center border-2 border-dashed border-purple-200 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Quiz Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Interactive quiz functionality will be implemented here
        </p>
        <Button 
          onClick={() => onProgressUpdate(85)} 
          className="bg-purple-600 hover:bg-purple-700"
        >
          Simulate Quiz (85% Score)
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground text-center">
        Score 80% or higher to complete this lesson
      </div>
    </div>
  );
}

function AssetLessonViewer({ 
  assetUrl, 
  progress, 
  onProgressUpdate 
}: {
  assetUrl: string | null;
  progress: number;
  onProgressUpdate: (progress: number) => void;
}) {
  if (!assetUrl) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-red-200 rounded-lg">
        <p className="text-red-600">No asset URL provided</p>
      </div>
    );
  }

  const handleDownload = () => {
    // Open the asset URL in a new tab for download
    window.open(assetUrl, '_blank');
    // Mark as completed
    onProgressUpdate(100);
  };

  return (
    <div className="space-y-4">
      <div className="p-8 text-center border-2 border-dashed border-green-200 rounded-lg">
        <Download className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-medium mb-2">Download Required Resource</h3>
        <p className="text-muted-foreground mb-4">
          Click the button below to download and view the required materials
        </p>
        <Button 
          onClick={handleDownload}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Resource
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground text-center">
        Download the resource to complete this lesson
      </div>
    </div>
  );
}
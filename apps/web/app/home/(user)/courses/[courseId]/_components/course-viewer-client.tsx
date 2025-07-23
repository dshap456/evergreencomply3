'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { StorageVideoPlayer } from './storage-video-player';

interface CourseViewerClientProps {
  courseId: string;
}

interface CourseLesson {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'text' | 'quiz' | 'asset';
  order_index: number;
  video_url: string | null;
  content: string | null;
  asset_url: string | null;
  is_final_quiz: boolean;
  completed: boolean;
  time_spent: number;
  is_locked?: boolean;
  video_progress?: number;
  quiz_score?: number;
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: CourseLesson[];
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  enrollment_id: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
  final_score: number | null;
  modules: CourseModule[];
}

export function CourseViewerClient({ courseId }: CourseViewerClientProps) {
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/debug-course?courseId=${courseId}`);
      const result = await response.json();
      
      if (result.success) {
        // Process lessons to determine locked state
        const processedCourse = processLessonLockStates(result.course);
        setCourse(processedCourse);
      } else {
        setError(result.error || 'Failed to load course data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const processLessonLockStates = (courseData: CourseData): CourseData => {
    let previousLessonCompleted = true;
    
    const processedModules = courseData.modules.map(module => {
      const processedLessons = module.lessons.map(lesson => {
        // First lesson is always unlocked, others depend on previous completion
        const isLocked = !previousLessonCompleted;
        
        // Check if lesson meets completion criteria
        // For now, we rely on the lesson.completed flag from lesson_progress table
        // which already validates completion requirements (95% video, 80% quiz score)
        const isFullyCompleted = lesson.completed;
        
        // Update previous lesson completed state for next iteration
        if (!isLocked) {
          previousLessonCompleted = isFullyCompleted;
        }
        
        return {
          ...lesson,
          is_locked: isLocked,
          completed: isFullyCompleted
        };
      });
      
      return {
        ...module,
        lessons: processedLessons
      };
    });
    
    return {
      ...courseData,
      modules: processedModules
    };
  };

  useEffect(() => {
    loadCourseData();
  }, [courseId]);


  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-green-100 text-green-800';
      case 'quiz': return 'bg-purple-100 text-purple-800';
      case 'asset': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextLesson = () => {
    for (const module of course?.modules || []) {
      for (const lesson of module.lessons) {
        if (!lesson.completed && !lesson.is_locked) {
          return { module, lesson };
        }
      }
    }
    return null;
  };

  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  // Auto-select the first incomplete lesson when course loads
  useEffect(() => {
    if (course && !currentLessonId) {
      const nextLesson = getNextLesson();
      if (nextLesson) {
        setCurrentLessonId(nextLesson.lesson.id);
      }
    }
  }, [course, currentLessonId]);

  const handleSelectLesson = (lessonId: string) => {
    // Find the lesson to check if it's locked
    const lesson = course?.modules
      .flatMap(m => m.lessons)
      .find(l => l.id === lessonId);
    
    if (lesson?.is_locked) {
      // Don't allow selecting locked lessons
      return;
    }
    
    setCurrentLessonId(lessonId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const getCurrentLesson = () => {
    for (const module of course?.modules || []) {
      for (const lesson of module.lessons) {
        if (lesson.id === currentLessonId) {
          return { module, lesson };
        }
      }
    }
    return null;
  };

  const getNextLessonInSequence = () => {
    const currentLesson = getCurrentLesson();
    if (!currentLesson || !course) return null;

    const allLessons: Array<{ module: CourseModule; lesson: CourseLesson }> = [];
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessons.push({ module, lesson });
      });
    });

    const currentIndex = allLessons.findIndex(item => item.lesson.id === currentLessonId);
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      // Only return the next lesson if it's not locked
      return nextLesson.lesson.is_locked ? null : nextLesson;
    }
    return null;
  };

  const isLastLesson = () => {
    if (!course || !currentLessonId) return false;
    
    const allLessons: Array<{ module: CourseModule; lesson: CourseLesson }> = [];
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessons.push({ module, lesson });
      });
    });
    
    const currentIndex = allLessons.findIndex(item => item.lesson.id === currentLessonId);
    return currentIndex === allLessons.length - 1;
  };

  const handleNextLesson = () => {
    const nextLesson = getNextLessonInSequence();
    if (nextLesson) {
      console.log('🎯 Manual navigation to next lesson:', nextLesson.lesson.title);
      setCurrentLessonId(nextLesson.lesson.id);
    } else {
      console.log('❌ No next lesson available');
    }
  };

  const handleLessonCompletion = async (lessonId: string, timeSpent?: number) => {
    try {
      // Mark lesson as complete in database
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_spent: timeSpent })
      });

      if (response.ok) {
        console.log('✅ Lesson completion saved to database');
        
        // Get fresh course data from server to ensure consistency
        const courseResponse = await fetch(`/api/debug-course?courseId=${courseId}`);
        const courseResult = await courseResponse.json();
        
        if (courseResult.success) {
          // Process lessons to determine locked state with fresh server data
          const processedCourse = processLessonLockStates(courseResult.course);
          setCourse(processedCourse);
          
          // Preserve current lesson selection (don't reset to first lesson)
          const preserveCurrentLesson = currentLessonId;
          
          // Find next lesson based on server data
          const allLessons: Array<{ module: CourseModule; lesson: CourseLesson }> = [];
          processedCourse.modules.forEach(module => {
            module.lessons.forEach(lesson => {
              allLessons.push({ module, lesson });
            });
          });

          const currentIndex = allLessons.findIndex(item => item.lesson.id === lessonId);
          if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
            const nextLessonData = allLessons[currentIndex + 1];
            
            // Auto-advance to next lesson after a short delay
            setTimeout(() => {
              console.log('🚀 Auto-advancing to next lesson:', nextLessonData.lesson.title);
              setCurrentLessonId(nextLessonData.lesson.id);
            }, 1500); // 1.5 second delay to show completion
          }
        } else {
          console.error('❌ Failed to refresh course data after completion');
        }
        
      } else {
        console.error('❌ Failed to save lesson completion');
      }
    } catch (error) {
      console.error('❌ Error saving lesson completion:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3">
            <Spinner className="h-5 w-5" />
            <span>Loading course content...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-4">Failed to Load Course</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={loadCourseData} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!course) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>No course data available</p>
        </CardContent>
      </Card>
    );
  }

  const currentLesson = getCurrentLesson();

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 absolute inset-0 top-16">
      {/* Sidebar - Course Navigation */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 ${sidebarMinimized ? 'w-16' : 'w-80'} bg-white transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4">
            {!sidebarMinimized ? (
              <div>
                <h2 className="font-semibold text-lg truncate">{course.title}</h2>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  📚
                </div>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" 
                size="sm" 
                onClick={() => setSidebarMinimized(!sidebarMinimized)}
                className="hidden lg:flex"
                title={sidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
              >
                {sidebarMinimized ? '→' : '←'}
              </Button>
              <Button
                variant="ghost" 
                size="sm" 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Course Navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sidebarMinimized ? (
              // Minimized view - just lesson dots
              <div className="space-y-2">
                {course.modules.map((module) =>
                  module.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => handleSelectLesson(lesson.id)}
                      disabled={lesson.is_locked}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        lesson.is_locked
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : currentLessonId === lesson.id 
                            ? 'bg-blue-600 text-white' 
                            : lesson.completed 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={`${lesson.title} (${module.title})${lesson.is_locked ? ' - Locked' : ''}`}
                    >
                      {lesson.is_locked ? '🔒' : lesson.completed ? '✓' : lesson.order_index}
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Full view - modules and lessons
              course.modules.map((module) => (
                <div key={module.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{module.title}</h3>
                  </div>
                  <div className="space-y-1">
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson.id)}
                        disabled={lesson.is_locked}
                        className={`w-full flex items-center gap-3 p-2 text-left rounded-lg transition-all text-sm ${
                          lesson.is_locked
                            ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                            : currentLessonId === lesson.id 
                              ? 'bg-blue-100 border border-blue-200 text-blue-900' 
                              : lesson.completed 
                                ? 'bg-green-50 hover:bg-green-100' 
                                : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          lesson.is_locked 
                            ? 'bg-gray-300 text-gray-500' 
                            : lesson.completed 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {lesson.is_locked ? '🔒' : lesson.completed ? '✓' : lesson.order_index}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`truncate font-medium ${lesson.is_locked ? 'text-gray-500' : ''}`}>
                              {lesson.title}
                            </span>
                          </div>
                          {lesson.is_locked && (
                            <p className="text-xs text-gray-500 mt-0.5">Complete previous lesson to unlock</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white">
          <Button
            variant="ghost" 
            size="sm" 
            onClick={() => setSidebarOpen(true)}
          >
            ☰ Course Menu
          </Button>
          <h1 className="font-medium truncate">{currentLesson?.lesson.title || 'Select a lesson'}</h1>
        </div>

        {/* Lesson Player */}
        <div className="flex-1 bg-white">
          {currentLesson ? (
            <LessonPlayer 
              lesson={currentLesson.lesson} 
              module={currentLesson.module}
              onNext={handleNextLesson}
              hasNextLesson={!!getNextLessonInSequence()}
              isLastLesson={isLastLesson()}
              onLessonComplete={handleLessonCompletion}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Welcome to {course.title}</h2>
                <p className="text-gray-600 mb-4">Select a lesson from the sidebar to get started</p>
                <Button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                  Open Course Menu
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

// Lesson Player Component
function LessonPlayer({ 
  lesson, 
  module, 
  onNext,
  hasNextLesson,
  isLastLesson,
  onLessonComplete
}: { 
  lesson: CourseLesson; 
  module: CourseModule;
  onNext: () => void;
  hasNextLesson: boolean;
  isLastLesson: boolean;
  onLessonComplete: (lessonId: string, timeSpent?: number) => void;
}) {
  const [currentLessonCompleted, setCurrentLessonCompleted] = useState(lesson.completed);
  
  // Reset completion state when lesson changes
  useEffect(() => {
    setCurrentLessonCompleted(lesson.completed);
  }, [lesson.id, lesson.completed]);


  const renderLessonContent = () => {
    switch (lesson.content_type) {
      case 'video':
        return (
          <div className="aspect-video bg-black flex items-center justify-center">
            <div className="w-full h-full relative">
              <StorageVideoPlayer 
                lessonId={lesson.id}
                onProgress={(progress) => {
                  // TODO: Track video progress for completion requirements
                  console.log('Video progress:', progress);
                }}
                onCompletion={(completed) => {
                  if (completed) {
                    setCurrentLessonCompleted(true);
                    // Save completion to database and refresh course data
                    onLessonComplete(lesson.id);
                  }
                }}
              />
            </div>
          </div>
        );
        
      case 'text':
        return (
          <div className="prose max-w-none bg-white rounded-lg p-6">
            <h1>{lesson.title}</h1>
            {lesson.content ? (
              <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
            ) : (
              <div>
                <p>Text lesson content will be displayed here.</p>
                <p className="text-gray-500">Content: {lesson.content || 'No content set'}</p>
              </div>
            )}
          </div>
        );
        
      case 'quiz':
        return (
          <QuizPlayer 
            lesson={lesson}
            currentScore={lesson.quiz_score}
            onQuizComplete={(score, passed) => {
              if (passed && score >= 80) {
                setCurrentLessonCompleted(true);
                // Save quiz completion to database and refresh course data
                onLessonComplete(lesson.id);
              }
            }}
          />
        );
        
      case 'asset':
        return (
          <div className="bg-white rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-2">{lesson.title}</h2>
            <p className="text-gray-600 mb-4">Asset content</p>
            {lesson.asset_url && (
              <a 
                href={lesson.asset_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
Download Asset
              </a>
            )}
          </div>
        );
        
      default:
        return (
          <div className="bg-white rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-2">{lesson.title}</h2>
            <p className="text-gray-600">Unknown content type: {lesson.content_type}</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Lesson Header */}
      <div className="bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-xl font-bold">{lesson.title}</h1>
                <p className="text-sm text-gray-600">{module.title}</p>
              </div>
            </div>
            {lesson.description && (
              <p className="text-gray-700 mt-2">{lesson.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentLessonCompleted && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ Completed
              </Badge>
            )}
            <Button 
              onClick={onNext} 
              variant="default"
              disabled={!currentLessonCompleted || (!hasNextLesson && !isLastLesson)}
              className={currentLessonCompleted ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isLastLesson ? 'Course Complete' : 'Next Lesson →'}
            </Button>
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="flex-1 p-6 bg-gray-50">
        {renderLessonContent()}
      </div>
    </div>
  );
}

// Custom Video Player Component that prevents fast-forwarding
function VideoPlayer({ 
  src, 
  isPlaceholder,
  onProgress,
  onCompletion
}: { 
  src: string; 
  isPlaceholder: boolean;
  onProgress: (progress: number) => void;
  onCompletion: (completed: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);
      
      // Update max watched time only if moving forward
      if (current > maxWatchedTime) {
        setMaxWatchedTime(current);
      }
      
      // Calculate and report progress
      if (duration > 0) {
        const progress = (maxWatchedTime / duration) * 100;
        onProgress(progress);
        
        // Check if video meets completion requirement (95%)
        if (progress >= 95 && !isCompleted) {
          setIsCompleted(true);
          onCompletion(true);
        }
      }
    };

    const handleSeeking = () => {
      const current = video.currentTime;
      
      // Prevent seeking beyond the maximum watched time (plus a small buffer for rewind)
      if (current > maxWatchedTime + 1) {
        video.currentTime = maxWatchedTime;
        return;
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [maxWatchedTime, duration, onProgress, onCompletion, isCompleted]);

  const handleRewind = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 10);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxProgressPercentage = duration > 0 ? (maxWatchedTime / duration) * 100 : 0;

  return (
    <div className="w-full h-full relative bg-black">
      <video 
        ref={videoRef}
        className="w-full h-full"
        src={src}
        onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
      >
        Your browser does not support the video tag.
      </video>
      
      {/* Custom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="w-full bg-gray-600 rounded-full h-1 relative">
            {/* Max watched progress (gray) */}
            <div 
              className="bg-gray-400 h-1 rounded-full absolute top-0 left-0"
              style={{ width: `${maxProgressPercentage}%` }}
            />
            {/* Current progress (blue) */}
            <div 
              className="bg-blue-500 h-1 rounded-full absolute top-0 left-0"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRewind}
              className="text-white hover:bg-white/20 p-2"
              title="Rewind 10 seconds"
            >
              ⏪
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="text-white hover:bg-white/20 p-2"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </Button>
          </div>
          
          <div className="text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
      
      {/* Placeholder indicator */}
      {isPlaceholder && (
        <div className="absolute top-4 left-4 bg-yellow-500 text-black px-2 py-1 rounded text-xs">
          Sample Video - Content Not Yet Uploaded
        </div>
      )}
    </div>
  );
}

// Quiz Question Interface
interface QuizQuestion {
  id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

// Quiz Player Component
function QuizPlayer({ 
  lesson, 
  currentScore,
  onQuizComplete 
}: { 
  lesson: CourseLesson;
  currentScore?: number;
  onQuizComplete: (score: number, passed: boolean) => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch quiz questions from database
  useEffect(() => {
    const fetchQuizQuestions = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/quiz-questions?lessonId=${lesson.id}`);
        const result = await response.json();
        
        if (result.success && result.questions) {
          setQuestions(result.questions);
        } else {
          console.error('Failed to fetch quiz questions:', result.error);
          // If no questions found, show empty state and mark as completed
          setQuestions([]);
          // Automatically mark empty quiz as completed so user can proceed
          onQuizComplete(100, true);
        }
      } catch (error) {
        console.error('Error fetching quiz questions:', error);
        setQuestions([]);
        // Also mark as completed in error case so user isn't blocked
        onQuizComplete(100, true);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizQuestions();
  }, [lesson.id]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer) {
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: selectedAnswer
      }));

      if (isLastQuestion) {
        submitQuiz();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer('');
      }
    }
  };

  const submitQuiz = () => {
    const finalAnswers = {
      ...userAnswers,
      [currentQuestion.id]: selectedAnswer
    };

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;

    questions.forEach(question => {
      totalPoints += question.points;
      if (finalAnswers[question.id] === question.correct_answer) {
        correctAnswers += question.points;
      }
    });

    const scorePercentage = Math.round((correctAnswers / totalPoints) * 100);
    const passed = scorePercentage >= 80;

    setFinalScore(scorePercentage);
    setQuizCompleted(true);
    setIsSubmitted(true);

    // Notify parent component
    onQuizComplete(scorePercentage, passed);
  };

  const retakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSelectedAnswer('');
    setQuizCompleted(false);
    setIsSubmitted(false);
    setFinalScore(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 text-center">
        <Spinner className="mx-auto mb-4" />
        <p>Loading quiz questions...</p>
      </div>
    );
  }

  // Handle empty state when no questions are found
  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-xl font-bold mb-2">{lesson.title}</h2>
        {lesson.is_final_quiz && (
          <Badge variant="destructive" className="mb-4">Final Quiz</Badge>
        )}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 font-medium">
            ⚠️ No quiz questions have been created for this lesson yet.
          </p>
          <p className="text-yellow-700 text-sm mt-2">
            Contact your instructor or check back later for quiz content.
          </p>
        </div>
        
        {/* For now, treat empty quiz as completed so users can proceed */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800 font-medium">
            ✅ This lesson is marked as complete since no quiz content is available.
          </p>
        </div>
        
        <div className="text-sm text-gray-500">
          This quiz will be available once questions are added to the course.
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const passed = finalScore! >= 80;
    return (
      <div className="bg-white rounded-lg p-6 text-center">
        <div className="text-6xl mb-4">
          {passed ? '🎉' : '📚'}
        </div>
        <h2 className="text-2xl font-bold mb-4">
          {passed ? 'Congratulations!' : 'Keep Learning!'}
        </h2>
        <div className="mb-4">
          <div className={`text-4xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {finalScore}%
          </div>
          <p className="text-gray-600">
            You scored {finalScore}% ({passed ? 'Passed' : 'Failed'})
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Minimum passing score: 80%
          </p>
        </div>
        
        {lesson.is_final_quiz && (
          <Badge variant="destructive" className="mb-4">Final Quiz</Badge>
        )}

        {passed ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800 font-medium">
              ✅ Quiz completed successfully! You can now proceed to the next lesson.
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-medium">
              ❌ Score too low. You need at least 80% to pass.
            </p>
            <Button 
              onClick={retakeQuiz}
              variant="outline"
              className="mt-3"
            >
              Retake Quiz
            </Button>
          </div>
        )}

        {currentScore && currentScore !== finalScore && (
          <p className="text-sm text-gray-500">
            Previous best score: {currentScore}%
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Quiz Header */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-xl font-bold">{lesson.title}</h2>
          {lesson.is_final_quiz && (
            <Badge variant="destructive">Final Quiz</Badge>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">
          {currentQuestion.question}
        </h3>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                selectedAnswer === option 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="quiz-answer"
                value={option}
                checked={selectedAnswer === option}
                onChange={(e) => handleAnswerSelect(e.target.value)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                selectedAnswer === option 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300'
              }`}>
                {selectedAnswer === option && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <span className="text-gray-800">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {selectedAnswer ? 'Answer selected' : 'Please select an answer'}
        </div>
        
        <Button
          onClick={handleNextQuestion}
          disabled={!selectedAnswer}
          className={selectedAnswer ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          {isLastQuestion ? 'Submit Quiz' : 'Next Question →'}
        </Button>
      </div>

      {/* Quiz Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <p><strong>Passing Score:</strong> 80% ({Math.ceil(totalQuestions * 0.8)}/{totalQuestions} questions correct)</p>
          <p><strong>Questions:</strong> {totalQuestions} multiple choice</p>
          <p><strong>Attempts:</strong> Unlimited retakes allowed</p>
        </div>
      </div>
    </div>
  );
}
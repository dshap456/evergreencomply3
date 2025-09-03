'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Progress } from '@kit/ui/progress';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
import { Separator } from '@kit/ui/separator';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

import { VideoPlayer } from './video-player';
import { QuizPlayer } from './quiz-player';

interface CoursePlayerProps {
  courseId: string;
  enrollmentId: string;
  onComplete?: () => void;
  className?: string;
}

interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'text' | 'quiz' | 'asset';
  order_index: number;
  is_final_quiz: boolean;
  video_url?: string;
  content?: string;
  asset_url?: string;
  is_accessible: boolean;
  is_completed: boolean;
  progress_percentage?: number;
}

interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  currentLessonId?: string;
}

interface LanguagePreference {
  language_code: 'en' | 'es';
  can_switch: boolean;
}

export function CoursePlayer({
  courseId,
  enrollmentId,
  onComplete,
  className = ''
}: CoursePlayerProps) {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>({
    language_code: 'en',
    can_switch: true
  });
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Load course data and structure
  const loadCourseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Load course information
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          modules:course_modules(
            id,
            title,
            description,
            order_index,
            lessons(
              id,
              title,
              description,
              content_type,
              order_index,
              is_final_quiz,
              video_url,
              content,
              asset_url
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (courseError) {
        throw new Error(`Failed to load course: ${courseError.message}`);
      }

      setCourse(courseData);

      // Load language preference from localStorage
      const storedLang = localStorage.getItem(`course_lang_${courseId}`) as 'en' | 'es' | null;
      if (storedLang) {
        setLanguagePreference(prev => ({
          ...prev,
          language_code: storedLang
        }));
      } else {
        // Show language selection dialog for first-time users
        setShowLanguageDialog(true);
      }

      // Bulk-read lesson progress for all lessons at once
      const lessonIds = courseData.modules.flatMap((m: any) => 
        (m.lessons || []).map((l: any) => l.id)
      );

      console.log('[DEBUG] Loading progress for user:', userId);
      console.log('[DEBUG] Lesson IDs to check:', lessonIds);

      const { data: lpRows, error: lpErr } = await supabase
        .from('lesson_progress')
        .select('lesson_id, status, language, updated_at')
        .in('lesson_id', lessonIds)
        .eq('user_id', userId);

      if (lpErr) {
        console.error('[ERROR] Failed to read lesson progress:', lpErr);
      } else {
        console.log('[DEBUG] Lesson progress rows found:', lpRows);
      }

      // Build a set of completed lessons for quick lookup
      const completedSet = new Set(
        (lpRows || [])
          .filter(r => r.status === 'completed')
          .map(r => r.lesson_id)
      );
      
      console.log('[DEBUG] Completed lessons set:', Array.from(completedSet));

      // Process modules and lessons with accessibility
      const processedModules = await Promise.all(
        courseData.modules
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map(async (module: any) => {
            const processedLessons = await Promise.all(
              module.lessons
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map(async (lesson: any) => {
                  // Check if lesson is accessible
                  const { data: isAccessible } = await supabase.rpc(
                    'is_lesson_accessible',
                    {
                      p_user_id: userId,
                      p_lesson_id: lesson.id
                    }
                  );

                  // Use the pre-fetched completion status from bulk read
                  return {
                    ...lesson,
                    is_accessible: isAccessible || false,
                    is_completed: completedSet.has(lesson.id)
                  };
                })
            );

            return {
              ...module,
              lessons: processedLessons
            };
          })
      );

      setModules(processedModules);

      // Try to restore the last accessed lesson first
      const lastAccessedLessonId = localStorage.getItem(`last_lesson_${courseId}`);
      let nextLessonId = null;
      
      // Check if last accessed lesson is still valid and accessible
      if (lastAccessedLessonId) {
        const lastLesson = processedModules
          .flatMap(m => m.lessons)
          .find(l => l.id === lastAccessedLessonId);
        
        if (lastLesson && lastLesson.is_accessible) {
          console.log('[DEBUG] Restoring last accessed lesson:', lastAccessedLessonId);
          nextLessonId = lastAccessedLessonId;
        }
      }
      
      // If no last accessed or it's not valid, find first incomplete accessible lesson
      if (!nextLessonId) {
        console.log('[DEBUG] Finding next incomplete lesson...');
        const allLessons = processedModules.flatMap(m => m.lessons);
        
        // First, try to find the first incomplete but accessible lesson
        for (const lesson of allLessons) {
          console.log('[DEBUG] Checking lesson:', lesson.id, 'accessible:', lesson.is_accessible, 'completed:', lesson.is_completed);
          if (lesson.is_accessible && !lesson.is_completed) {
            nextLessonId = lesson.id;
            console.log('[DEBUG] Found next incomplete lesson:', nextLessonId);
            break;
          }
        }
        
        // If no incomplete lessons, find the first accessible lesson (might be reviewing)
        if (!nextLessonId) {
          for (const lesson of allLessons) {
            if (lesson.is_accessible) {
              nextLessonId = lesson.id;
              console.log('[DEBUG] All lessons complete, starting from first accessible:', nextLessonId);
              break;
            }
          }
        }
      }

      if (nextLessonId) {
        setCurrentLessonId(nextLessonId);
      } else {
        // Course might be completed, find last lesson
        const allLessons = processedModules.flatMap(m => m.lessons);
        if (allLessons.length > 0) {
          console.log('[DEBUG] No incomplete lessons found, showing last lesson');
          setCurrentLessonId(allLessons[allLessons.length - 1].id);
        }
      }

      // Calculate progress
      const allLessons = processedModules.flatMap(m => m.lessons);
      const completedLessons = allLessons.filter(l => l.is_completed);
      const progressPercentage = allLessons.length > 0 
        ? Math.round((completedLessons.length / allLessons.length) * 100)
        : 0;

      setProgress({
        courseId,
        totalLessons: allLessons.length,
        completedLessons: completedLessons.length,
        progressPercentage,
        currentLessonId: nextLessonId || undefined
      });

    } catch (err) {
      console.error('Error loading course data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId, supabase]);

  // Set current lesson and update data
  const selectLesson = useCallback((lessonId: string) => {
    const lesson = modules
      .flatMap(m => m.lessons)
      .find(l => l.id === lessonId);

    if (lesson && lesson.is_accessible) {
      setCurrentLessonId(lessonId);
      setCurrentLesson(lesson);
      // Remember the last accessed lesson
      localStorage.setItem(`last_lesson_${courseId}`, lessonId);
      console.log('[DEBUG] Selected lesson:', lessonId);
    }
  }, [modules, courseId]);

  // Handle lesson completion
  const handleLessonComplete = useCallback(async (lessonId: string) => {
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Mark lesson as completed with user_id, language, and onConflict
      console.log('[DEBUG] Attempting to save lesson completion:');
      console.log('[DEBUG] - User ID:', userId);
      console.log('[DEBUG] - Lesson ID:', lessonId);
      console.log('[DEBUG] - Language:', languagePreference.language_code);
      
      const { data: upsertData, error: progressError } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          status: 'completed',
          language: languagePreference.language_code, // Required for unique constraint
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id,lesson_id,language' // Explicitly handle the composite unique constraint
        })
        .select();

      if (progressError) {
        console.error('[ERROR] Failed to update lesson progress:', progressError);
        console.error('[ERROR] Full error details:', JSON.stringify(progressError, null, 2));
      } else {
        console.log('[SUCCESS] Lesson progress saved:', upsertData);
      }

      // Recalculate course progress
      const { data: newProgress } = await supabase.rpc(
        'calculate_course_progress',
        {
          p_user_id: userId,
          p_course_id: courseId
        }
      );

      // Check if course is now complete
      if (newProgress === 100) {
        try {
          await supabase.rpc('complete_course', {
            p_user_id: userId,
            p_course_id: courseId
          });
          onComplete?.();
        } catch (completionError) {
          console.warn('Course completion error:', completionError);
        }
      }

      // Auto-advance to next lesson
      const allLessons = modules.flatMap(m => m.lessons);
      const currentIndex = allLessons.findIndex(l => l.id === lessonId);
      if (currentIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndex + 1];
        console.log('[DEBUG] Auto-advancing to next lesson:', nextLesson.id);
        // Small delay for better UX
        setTimeout(() => {
          selectLesson(nextLesson.id);
          // Reload to update accessibility and progress
          loadCourseData();
        }, 1500);
      } else {
        // Just reload to update progress
        loadCourseData();
      }

    } catch (error) {
      console.error('Error handling lesson completion:', error);
    }
  }, [courseId, modules, supabase, onComplete, selectLesson, loadCourseData]);

  // Handle language selection
  const handleLanguageChange = useCallback(async (newLanguage: 'en' | 'es') => {
    try {
      const confirmSwitch = currentLesson 
        ? confirm('Switching language will restart your current lesson. Continue?')
        : true;

      if (!confirmSwitch) return;

      // Update language preference in state
      setLanguagePreference(prev => ({
        ...prev,
        language_code: newLanguage
      }));
      setShowLanguageDialog(false);
      
      // Store in localStorage for persistence
      localStorage.setItem(`course_lang_${courseId}`, newLanguage);
      
      // Reload course data for new language
      loadCourseData();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }, [courseId, currentLesson, supabase, loadCourseData]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load course data on mount
  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Update current lesson when selection changes
  useEffect(() => {
    if (currentLessonId) {
      const lesson = modules
        .flatMap(m => m.lessons)
        .find(l => l.id === currentLessonId);
      setCurrentLesson(lesson || null);
    }
  }, [currentLessonId, modules]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderLessonContent = () => {
    if (!currentLesson) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Select a lesson to begin</p>
        </div>
      );
    }

    if (!currentLesson.is_accessible) {
      return (
        <div className="flex items-center justify-center h-64 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-center">
            <p className="text-yellow-700 mb-2">🔒 Lesson Locked</p>
            <p className="text-sm text-yellow-600">
              Complete previous lessons to unlock this content
            </p>
          </div>
        </div>
      );
    }

    switch (currentLesson.content_type) {
      case 'video':
        return (
          <VideoPlayer
            lessonId={currentLesson.id}
            courseId={courseId}
            title={currentLesson.title}
            languageCode={languagePreference.language_code}
            autoPlay={isMobile} // Auto-play on mobile for better UX
            onComplete={() => handleLessonComplete(currentLesson.id)}
            className="w-full"
          />
        );

      case 'quiz':
        return (
          <QuizPlayer
            lessonId={currentLesson.id}
            title={currentLesson.title}
            isFinalQuiz={currentLesson.is_final_quiz}
            languageCode={languagePreference.language_code}
            onComplete={() => handleLessonComplete(currentLesson.id)}
            className="w-full"
          />
        );

      case 'text':
        return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{currentLesson.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: currentLesson.content || '' }}
              />
              <div className="mt-6 flex justify-end">
                <Button onClick={() => handleLessonComplete(currentLesson.id)}>
                  Mark as Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <p className="text-gray-600">Unsupported lesson type</p>
          </div>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Language Selection Dialog */}
      {showLanguageDialog && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🌐 Select Language / Seleccionar Idioma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Choose your preferred language for this course. You can change this later, but switching mid-course will restart your current lesson.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => handleLanguageChange('en')}
                variant={languagePreference.language_code === 'en' ? 'default' : 'outline'}
              >
                🇺🇸 English
              </Button>
              <Button 
                onClick={() => handleLanguageChange('es')}
                variant={languagePreference.language_code === 'es' ? 'default' : 'outline'}
              >
                🇪🇸 Español
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{course?.title}</CardTitle>
              {course?.description && (
                <p className="text-gray-600 mt-1">{course.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* DEBUG: Quick Complete Button */}
              {currentLesson && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    console.log('[DEBUG] Quick completing lesson:', currentLesson.id);
                    handleLessonComplete(currentLesson.id);
                  }}
                  className="text-xs"
                >
                  🔧 Quick Complete
                </Button>
              )}
              {/* Language Switcher */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLanguageDialog(true)}
                className="text-xs"
              >
                {languagePreference.language_code === 'en' ? '🇺🇸' : '🇪🇸'}
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Course Progress</span>
                <span>{progress.completedLessons} / {progress.totalLessons} lessons</span>
              </div>
              <Progress value={progress.progressPercentage} className="h-2" />
              <p className="text-xs text-gray-500">
                {progress.progressPercentage}% complete
              </p>
              {/* DEBUG: Show current lesson info */}
              <div className="text-xs bg-yellow-50 p-2 rounded border border-yellow-200">
                <strong>Debug Info:</strong><br/>
                Current Lesson ID: {currentLessonId || 'none'}<br/>
                Language: {languagePreference.language_code}<br/>
                Last Saved: {localStorage.getItem(`last_lesson_${courseId}`) || 'none'}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Course Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Course Content</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {modules.map((module, moduleIndex) => (
                  <div key={module.id}>
                    <div className="px-4 py-2 bg-gray-50 border-b">
                      <h4 className="font-medium text-sm">{module.title}</h4>
                    </div>
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => selectLesson(lesson.id)}
                        disabled={!lesson.is_accessible}
                        className={`
                          w-full text-left px-4 py-2 text-sm border-b transition-colors
                          ${lesson.id === currentLessonId 
                            ? 'bg-blue-50 border-l-4 border-l-blue-500 text-blue-700'
                            : lesson.is_accessible
                              ? 'hover:bg-gray-50'
                              : 'text-gray-400 cursor-not-allowed'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{lesson.title}</span>
                          <div className="flex items-center gap-1 ml-2">
                            {lesson.is_final_quiz && (
                              <Badge variant="secondary" className="text-xs">
                                Final
                              </Badge>
                            )}
                            {lesson.is_completed ? (
                              <span className="text-green-600 text-xs">✓</span>
                            ) : lesson.is_accessible ? (
                              <span className="text-blue-600 text-xs">•</span>
                            ) : (
                              <span className="text-gray-400 text-xs">🔒</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {lesson.content_type === 'video' && '📹 Video'}
                          {lesson.content_type === 'quiz' && '📝 Quiz'}
                          {lesson.content_type === 'text' && '📄 Reading'}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {renderLessonContent()}
          
          {/* DEBUG: Quick action buttons */}
          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded">
            <p className="text-sm font-bold mb-2">🔧 Debug Controls:</p>
            <div className="flex gap-2 flex-wrap">
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => {
                  if (currentLessonId) {
                    console.log('[DEBUG] Marking lesson as complete:', currentLessonId);
                    handleLessonComplete(currentLessonId);
                  }
                }}
              >
                Mark Current as Complete
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('[DEBUG] Reloading course data...');
                  loadCourseData();
                }}
              >
                Reload Course Data
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('[DEBUG] Clearing localStorage...');
                  localStorage.removeItem(`last_lesson_${courseId}`);
                  localStorage.removeItem(`course_lang_${courseId}`);
                  loadCourseData();
                }}
              >
                Clear Local Storage
              </Button>
            </div>
            <p className="text-xs mt-2 text-red-700">
              Open browser console (F12) to see debug logs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
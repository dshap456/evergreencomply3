'use client';

// Import Video.js CSS globally for this page
import 'video.js/dist/video-js.css';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  current_language: 'en' | 'es';
}

export function CourseViewerClient({ courseId }: CourseViewerClientProps) {
  console.log('🚀 CourseViewerClient initialized with courseId:', courseId);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize language from localStorage with courseId-specific key
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es'>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem(`course-${courseId}-language`);
      return (savedLanguage === 'es' || savedLanguage === 'en') ? savedLanguage : 'en';
    }
    return 'en';
  });

  const loadCourseData = async (language: 'en' | 'es' = selectedLanguage) => {
    console.log('📚 Loading course data for courseId:', courseId, 'language:', language, 'type:', typeof courseId);
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/debug-course?courseId=${courseId}&language=${language}`);
      const result = await response.json();
      
      console.log('📚 API Response:', {
        status: response.status,
        success: result.success,
        error: result.error,
        hasCourse: !!result.course
      });
      
      if (result.success && result.course) {
        console.log('📚 Course data loaded successfully:', {
          title: result.course.title,
          modules: result.course.modules?.length,
          progress: result.course.progress_percentage
        });
        // Process lessons to determine locked state
        const processedCourse = processLessonLockStates(result.course);
        setCourse(processedCourse);
      } else {
        const errorMsg = result.error || 'Failed to load course data';
        console.error('❌ Failed to load course:', errorMsg);
        
        // Check if it's an enrollment issue
        if (errorMsg.includes('not enrolled')) {
          setError('You are not enrolled in this course. Please enroll first or contact support.');
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      console.error('❌ Exception loading course:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const processLessonLockStates = (courseData: CourseData): CourseData => {
    let previousLessonCompleted = true;
    let allLessonsFlat: CourseLesson[] = [];
    
    // First, flatten all lessons to process them in order
    courseData.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessonsFlat.push(lesson);
      });
    });
    
    // Process all lessons in sequence to determine lock states
    const processedLessonsMap = new Map<string, CourseLesson>();
    allLessonsFlat.forEach((lesson, index) => {
      // First lesson is always unlocked, others depend on previous completion
      const isLocked = index > 0 ? !previousLessonCompleted : false;
      
      // Check if lesson meets completion criteria
      const isFullyCompleted = lesson.completed || false;
      
      // Update previous lesson completed state for next iteration
      previousLessonCompleted = isFullyCompleted;
      
      processedLessonsMap.set(lesson.id, {
        ...lesson,
        is_locked: isLocked,
        completed: isFullyCompleted
      });
    });
    
    // Now rebuild modules with processed lessons
    const processedModules = courseData.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => 
        processedLessonsMap.get(lesson.id) || lesson
      )
    }));
    
    return {
      ...courseData,
      modules: processedModules
    };
  };

  useEffect(() => {
    console.log('🚀 Initial load effect - loading course data');
    // Don't reset currentLessonId here - let the restoration logic handle it
    
    // Load course data with the selected language (from localStorage or default)
    loadCourseData(selectedLanguage);
  }, [courseId]);

  const handleLanguageSwitch = async (newLanguage: 'en' | 'es') => {
    if (newLanguage === selectedLanguage) return;
    
    // Show warning about progress not being lost
    const message = newLanguage === 'es' 
      ? "Switching to Spanish content. Your progress in English will be saved.\n\nCambiando al contenido en español. Tu progreso en inglés se guardará."
      : "Switching to English content. Your progress in Spanish will be saved.\n\nCambiando al contenido en inglés. Tu progreso en español se guardará.";
      
    if (confirm(message)) {
      setSelectedLanguage(newLanguage);
      // Save language preference to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`course-${courseId}-language`, newLanguage);
      }
      setCurrentLessonId(null); // Reset current lesson
      setLessonRestorationKey(prev => prev + 1); // Trigger new restoration
      await loadCourseData(newLanguage);
    }
  };


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

  const [currentLessonId, setCurrentLessonIdRaw] = useState<string | null>(null);
  
  // Wrapper to debug lesson changes
  const setCurrentLessonId = (id: string | null) => {
    console.log(`🔄 Setting currentLessonId from "${currentLessonId}" to "${id}" (courseId: ${courseId})`);
    setCurrentLessonIdRaw(id);
  };
  const [lastAccessedLesson, setLastAccessedLesson] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [lessonRestorationKey, setLessonRestorationKey] = useState(0);
  const lastSavedLessonRef = useRef<string | null>(null);
  const isRestoringRef = useRef<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Save current lesson when it changes and on unmount
  useEffect(() => {
    console.log('📍 Save effect running - currentLessonId:', currentLessonId, 'courseId:', courseId, 'isInitialLoad:', isInitialLoad);
    
    // Don't save during initial load/restoration
    if (isInitialLoad) {
      console.log('⏸️ Skipping save - initial load/restoration');
      return;
    }

    // Don't save if courseId is missing
    if (!courseId) {
      console.warn('⚠️ Cannot save - courseId is missing');
      return;
    }

    // Save current lesson whenever it changes (not just on unmount)
    const saveCurrentLesson = async () => {
      console.log('🔍 Checking if should save - current:', currentLessonId, 'lastSaved:', lastSavedLessonRef.current);
      
      // Skip if no lesson selected
      if (!currentLessonId) {
        console.log('🚫 No lesson to save');
        return;
      }
      
      // Skip if already saved
      if (lastSavedLessonRef.current === currentLessonId) {
        console.log('🔄 Already saved this lesson');
        return;
      }
      
      console.log('💾 Auto-saving current lesson:', currentLessonId, 'for course:', courseId);
      lastSavedLessonRef.current = currentLessonId;
      
      try {
        console.log('📡 Sending save request with:', {
          lessonId: currentLessonId,
          courseId,
          language: selectedLanguage,
          updateLastAccessed: true
        });
        
        const response = await fetch('/api/lessons/update-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: currentLessonId,
            courseId,
            language: selectedLanguage,
            updateLastAccessed: true
          })
        });
        
        console.log('📨 Response received:', response.status, response.statusText);
        
        if (!response.ok) {
          const error = await response.json();
          console.error('❌ Failed to save current lesson:', error);
          // Reset lastSavedLessonRef on error so it can retry
          lastSavedLessonRef.current = null;
        } else {
          const result = await response.json();
          console.log('✅ Current lesson saved successfully:', result);
          
          // Verify by checking enrollment
          const verifyResponse = await fetch('/api/test-course-progress');
          const verifyResult = await verifyResponse.json();
          console.log('🔍 Verification - current_lesson_id in DB:', 
            verifyResult.enrollments?.find((e: any) => e.course_id === courseId)?.current_lesson_id
          );
        }
      } catch (error) {
        console.error('❌ Network error saving current lesson:', error);
        console.error('Full error details:', error);
        // Reset lastSavedLessonRef on error so it can retry
        lastSavedLessonRef.current = null;
      }
    };

    // Save immediately when lesson changes
    saveCurrentLesson();

    // Also save on unmount as backup
    return () => {
      if (currentLessonId) {
        console.log('🚪 Component unmounting - final save for lesson:', currentLessonId);
        // Try regular fetch first
        fetch('/api/lessons/update-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: currentLessonId,
            courseId,
            language: selectedLanguage,
            updateLastAccessed: true
          }),
          keepalive: true // This helps with unmount saves
        }).catch(() => {
          // Fallback to sendBeacon if fetch fails
          const data = JSON.stringify({
            lessonId: currentLessonId,
            courseId,
            language: selectedLanguage,
            updateLastAccessed: true
          });
          navigator.sendBeacon('/api/lessons/update-progress', new Blob([data], { type: 'application/json' }));
        });
      }
    };
  }, [currentLessonId, courseId, selectedLanguage, isInitialLoad]);

  // Fetch last accessed lesson from database when course loads
  useEffect(() => {
    console.log('🔍 Restoration effect running:', {
      hasCourse: !!course,
      currentLessonId,
      courseId,
      selectedLanguage
    });
    
    const fetchLastAccessedLesson = async () => {
      if (!course || !course.modules || course.modules.length === 0) {
        console.log('⏸️ No course data yet, waiting...');
        return;
      }
      
      // Only skip restoration if we explicitly have a lesson selected
      // (not if it's null from initialization)
      if (currentLessonId && lastSavedLessonRef.current === currentLessonId) {
        console.log('⏸️ Already have lesson selected and saved:', currentLessonId);
        return;
      }
      
      console.log('🔍 Fetching last accessed lesson...', {
        courseId,
        language: selectedLanguage,
        url: `/api/lessons/last-accessed?courseId=${courseId}&language=${selectedLanguage}`,
        totalModules: course.modules.length,
        totalLessons: course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
      });
      try {
        const response = await fetch(`/api/lessons/last-accessed?courseId=${courseId}&language=${selectedLanguage}`);
        const result = await response.json();
        
        console.log('📡 Last accessed API response:', {
          status: response.status,
          result
        });
        
        if (result.success && result.lessonId) {
          setLastAccessedLesson(result.lessonId);
          // Check if this lesson is still available (not locked)
          const allLessons = course.modules.flatMap(m => m.lessons);
          console.log('📚 All lessons in course (first 10):', allLessons.slice(0, 10).map(l => ({ 
            id: l.id, 
            title: l.title, 
            locked: l.is_locked,
            completed: l.completed 
          })));
          
          const lesson = allLessons.find(l => l.id === result.lessonId);
          
          console.log('🔍 Looking for lesson ID:', result.lessonId);
          console.log('📖 Found lesson:', lesson ? {
            id: lesson.id,
            title: lesson.title,
            is_locked: lesson.is_locked,
            completed: lesson.completed
          } : `NOT FOUND - Total lessons: ${allLessons.length}`);
          
          if (lesson && !lesson.is_locked) {
            console.log('✅ Restoring last accessed lesson:', lesson.title, lesson.id);
            setCurrentLessonId(result.lessonId);
            // Mark initial load as complete
            setIsInitialLoad(false);
            console.log('🎆 Initial load complete - saves enabled');
            return;
          } else {
            console.log('🔒 Cannot restore - lesson is locked or not found');
          }
        }
      } catch (error) {
        console.error('Failed to fetch last accessed lesson:', error);
      }
      
      // Fallback to first incomplete lesson if no valid last accessed lesson
      const nextLesson = getNextLesson();
      if (nextLesson) {
        console.log('📍 Falling back to first incomplete lesson:', nextLesson.lesson.title);
        setCurrentLessonId(nextLesson.lesson.id);
        // Mark initial load as complete
        setIsInitialLoad(false);
        console.log('🎆 Initial load complete - saves enabled');
      } else {
        console.log('❌ No available lessons found');
      }
    };
    
    fetchLastAccessedLesson();
  }, [course, lessonRestorationKey, courseId, selectedLanguage]); // Include all dependencies

  const handleSelectLesson = async (lessonId: string) => {
    // Find the lesson to check if it's locked
    const lesson = course?.modules
      .flatMap(m => m.lessons)
      .find(l => l.id === lessonId);
    
    if (lesson?.is_locked) {
      // Don't allow selecting locked lessons
      return;
    }
    
    // Ensure saves are enabled for manual navigation
    setIsInitialLoad(false);
    setCurrentLessonId(lessonId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
    // No need to save here - the useEffect will auto-save when currentLessonId changes
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
      // No need to save here - the useEffect will auto-save when currentLessonId changes
    } else {
      console.log('❌ No next lesson available');
    }
  };

  const handleLessonCompletion = async (lessonId: string, timeSpent?: number, quizScore?: number, isFinalQuiz?: boolean) => {
    try {
      // Mark lesson as complete in database
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          time_spent: timeSpent,
          quiz_score: quizScore,
          is_quiz: quizScore !== undefined,
          language: selectedLanguage
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Lesson completion saved to database:', responseData);
        
        // If this was a final quiz with a passing score, redirect to My Learning
        if (isFinalQuiz && quizScore && quizScore >= 80) {
          console.log('🎉 Final quiz passed! Redirecting to My Learning...');
          // Add a small delay to ensure database operations complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            // Use router.push for cleaner navigation within Next.js
            await router.push('/home/courses');
          } catch (navError) {
            console.error('❌ Navigation error:', navError);
            // Try alternative navigation
            window.location.href = '/home/courses';
          }
          return; // Exit early, no need to refresh course data since we're leaving
        }
        
        // Get fresh course data from server to ensure consistency
        const courseResponse = await fetch(`/api/debug-course?courseId=${courseId}&language=${selectedLanguage}`);
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
              // No need to save here - the useEffect will auto-save when currentLessonId changes
            }, 1500); // 1.5 second delay to show completion
          }
        } else {
          console.error('❌ Failed to refresh course data after completion:', courseResult.error);
          // Still mark the lesson as completed in the UI even if refresh fails
          const updatedModules = course.modules.map(module => ({
            ...module,
            lessons: module.lessons.map(lesson => 
              lesson.id === lessonId 
                ? { ...lesson, completed: true, quiz_score: quizScore }
                : lesson
            )
          }));
          setCourse({ ...course, modules: updatedModules });
        }
        
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to save lesson completion:', errorData);
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
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 absolute inset-0 top-16 overflow-hidden">
      {/* Sidebar - Course Navigation */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 ${sidebarMinimized ? 'w-16' : 'w-80'} bg-white transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4">
            {!sidebarMinimized ? (
              <div className="flex-1">
                <Link href="/home/courses" className="font-semibold text-lg truncate hover:text-blue-600 transition-colors cursor-pointer">
                  {course.title}
                </Link>
                {/* Language Switcher */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleLanguageSwitch('en')}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      selectedLanguage === 'en' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => handleLanguageSwitch('es')}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      selectedLanguage === 'es' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    ES
                  </button>
                </div>
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
                      {lesson.is_locked ? '🔒' : lesson.completed ? '✓' : ''}
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
                          {lesson.is_locked ? '🔒' : lesson.completed ? '✓' : ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`truncate font-medium ${lesson.is_locked ? 'text-gray-500' : ''}`}>
                              {lesson.title}
                            </span>
                          </div>
                          {/* {lesson.is_locked && (
                            <p className="text-xs text-gray-500 mt-0.5">Complete previous lesson to unlock</p>
                          )} */}
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-2 sm:p-3 bg-white gap-2 flex-shrink-0">
          <Button
            variant="ghost" 
            size="sm" 
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 text-xs sm:text-sm"
          >
            ☰ <span className="hidden xs:inline">Course Menu</span>
          </Button>
        </div>

        {/* Lesson Player */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          {currentLesson ? (
            <LessonPlayer 
              lesson={currentLesson.lesson} 
              module={currentLesson.module}
              onNext={handleNextLesson}
              hasNextLesson={!!getNextLessonInSequence()}
              isLastLesson={isLastLesson()}
              onLessonComplete={handleLessonCompletion}
              selectedLanguage={selectedLanguage}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  Welcome to <Link href="/home/courses" className="hover:text-blue-600 transition-colors cursor-pointer">{course.title}</Link>
                </h2>
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
  onLessonComplete,
  selectedLanguage
}: { 
  lesson: CourseLesson; 
  module: CourseModule;
  onNext: () => void;
  hasNextLesson: boolean;
  isLastLesson: boolean;
  onLessonComplete: (lessonId: string, timeSpent?: number, quizScore?: number, isFinalQuiz?: boolean) => void;
  selectedLanguage: 'en' | 'es';
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
          <div className="bg-gray-900 flex items-center justify-center w-full h-[25vh] sm:h-[35vh] md:h-[50vh] lg:h-[60vh] max-h-[200px] sm:max-h-[300px] md:max-h-[400px] lg:max-h-[500px]">
            <div className="w-full h-full relative flex items-center justify-center">
              <StorageVideoPlayer 
                lessonId={lesson.id}
                languageCode={selectedLanguage}
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
                // Save quiz completion to database with score
                // Pass is_final_quiz flag to handle redirect after API success
                onLessonComplete(lesson.id, 0, score, lesson.is_final_quiz);
              }
            }}
          />
        );
        
      case 'asset':
        return (
          <div className="bg-white rounded-lg p-3 sm:p-4 md:p-6 text-center">
            <h2 className="text-lg sm:text-xl font-bold mb-2">{lesson.title}</h2>
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Lesson Header - Mobile and Desktop */}
      <div className="bg-white p-2 sm:p-3 lg:p-4 flex-shrink-0">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {currentLessonCompleted && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs sm:text-sm px-2 py-0.5">
                <span className="hidden sm:inline">✓ Completed</span>
                <span className="sm:hidden">✓</span>
              </Badge>
            )}
            <Button 
              onClick={onNext} 
              variant="default"
              size="sm"
              disabled={!currentLessonCompleted || (!hasNextLesson && !isLastLesson)}
              className={`text-xs sm:text-sm ${currentLessonCompleted ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              <span className="hidden sm:inline">{isLastLesson ? 'Course Complete' : 'Next Lesson →'}</span>
              <span className="sm:hidden">{isLastLesson ? 'Complete' : 'Next →'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="flex-1 p-2 sm:p-4 md:p-6 bg-gray-50 overflow-y-auto">
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set up video for mobile compatibility
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    
    // Try to load video metadata for mobile
    video.load();

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

    const handlePlay = () => {
      setIsPlaying(true);
      setShowPlayButton(false);
    };
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
        video.play().catch(err => {
          console.log('Playback failed:', err);
          // Show play button again if autoplay fails
          setShowPlayButton(true);
        });
      }
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.log('Fullscreen failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const newTime = clickPercent * duration;

    // Only allow seeking within already watched portion
    if (newTime <= maxWatchedTime) {
      video.currentTime = newTime;
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxProgressPercentage = duration > 0 ? (maxWatchedTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} className="w-full h-full relative bg-black">
      <video 
        ref={videoRef}
        className="w-full h-full object-contain"
        src={src}
        playsInline
        preload="metadata"
        controls={false}
        onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
        {...{ 'webkit-playsinline': 'true' } as any}
      >
        Your browser does not support the video tag.
      </video>
      
      {/* Play Button Overlay for Mobile */}
      {showPlayButton && !isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={togglePlayPause}
        >
          <div className="bg-white/90 rounded-full p-4 md:p-6">
            <svg className="w-12 h-12 md:w-16 md:h-16 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}
      
      {/* Custom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 md:p-4">
        {/* Progress Bar */}
        <div className="mb-2 md:mb-3 py-2 -my-2" onClick={handleProgressClick}>
          <div className="w-full bg-gray-600 rounded-full h-3 md:h-1 relative cursor-pointer">
            {/* Max watched progress (gray) */}
            <div 
              className="bg-gray-400 h-full rounded-full absolute top-0 left-0"
              style={{ width: `${maxProgressPercentage}%` }}
            />
            {/* Current progress (blue) */}
            <div 
              className="bg-blue-500 h-full rounded-full absolute top-0 left-0"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handleRewind}
              className="text-white hover:bg-white/20 p-3 md:p-2 rounded-full min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center transition-colors"
              title="Rewind 10 seconds"
            >
              <span className="text-xl md:text-base">⏪</span>
            </button>
            
            <button
              onClick={togglePlayPause}
              className="text-white hover:bg-white/20 p-3 md:p-2 rounded-full min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              <span className="text-xl md:text-base">{isPlaying ? '⏸️' : '▶️'}</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-xs md:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 p-3 md:p-2 rounded-full min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center transition-colors"
              title="Fullscreen"
            >
              <svg className="w-5 h-5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-7 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"/>
              </svg>
            </button>
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
  const [redirecting, setRedirecting] = useState(false);

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

    // Mark as redirecting if this is a final quiz and user passed
    // The actual redirect will be handled by the parent after API success
    if (lesson.is_final_quiz && passed) {
      setRedirecting(true);
    }
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
              ✅ Quiz completed successfully!
            </p>
            {lesson.is_final_quiz && redirecting && (
              <div className="mt-2">
                <p className="text-green-700 text-sm flex items-center gap-2">
                  <Spinner className="h-3 w-3" />
                  Saving your progress and redirecting to My Learning...
                </p>
                <Link 
                  href="/home/courses"
                  className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block underline"
                >
                  Click here if you're not redirected automatically
                </Link>
              </div>
            )}
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
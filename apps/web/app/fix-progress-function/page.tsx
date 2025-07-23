export default function FixProgressFunctionPage() {
  const sql = `CREATE OR REPLACE FUNCTION public.update_course_progress(
    p_user_id UUID,
    p_lesson_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_course_id UUID;
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
    v_progress_percentage INTEGER;
    v_enrollment_id UUID;
BEGIN
    -- Get the course ID for this lesson
    SELECT c.id INTO v_course_id
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = p_lesson_id;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Lesson not found or invalid lesson ID';
    END IF;

    -- Get total number of lessons in the course
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = v_course_id;

    -- Get number of completed lessons for this user
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = v_course_id
    AND lp.user_id = p_user_id
    AND lp.status = 'completed';

    -- Calculate progress percentage
    IF v_total_lessons > 0 THEN
        v_progress_percentage := (v_completed_lessons * 100) / v_total_lessons;
    ELSE
        v_progress_percentage := 0;
    END IF;

    -- Get enrollment ID
    SELECT id INTO v_enrollment_id
    FROM public.course_enrollments
    WHERE user_id = p_user_id AND course_id = v_course_id;

    -- Update course enrollment progress
    IF v_enrollment_id IS NOT NULL THEN
        UPDATE public.course_enrollments
        SET 
            progress_percentage = v_progress_percentage,
            completed_at = CASE 
                WHEN v_progress_percentage >= 100 THEN NOW()
            ELSE completed_at
            END
        WHERE id = v_enrollment_id;
    END IF;

    -- Log the progress update
    RAISE LOG 'Course progress updated for user % in course %: %% complete (%/%)', 
        p_user_id, v_course_id, v_progress_percentage, v_completed_lessons, v_total_lessons;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_course_progress(UUID, UUID) TO authenticated;`;

  const copyToClipboard = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(sql);
      alert('SQL copied to clipboard!');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Fix Course Progress Function</h1>
      
      <div className="bg-red-50 border border-red-200 p-4 rounded">
        <h2 className="font-semibold text-red-800 mb-2">Issue Found:</h2>
        <p className="text-red-700">
          The <code>update_course_progress</code> function is missing from your database. 
          This is why course progress never updates from 0%.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
        <h2 className="font-semibold text-blue-800 mb-2">Solution:</h2>
        <ol className="list-decimal ml-5 space-y-2 text-blue-700">
          <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" className="underline">Supabase Dashboard</a></li>
          <li>Select your project</li>
          <li>Go to <strong>SQL Editor</strong></li>
          <li>Copy the SQL below and paste it into a new query</li>
          <li>Click <strong>Run</strong></li>
        </ol>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">SQL to Run:</h3>
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Copy to Clipboard
          </button>
        </div>
        
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto max-h-96">
          {sql}
        </pre>
      </div>

      <div className="bg-green-50 border border-green-200 p-4 rounded">
        <h2 className="font-semibold text-green-800 mb-2">After Running the SQL:</h2>
        <ol className="list-decimal ml-5 space-y-1 text-green-700">
          <li>Go back to <code>/test-update-progress</code></li>
          <li>Click "Test Update Progress" on any completed lesson</li>
          <li>You should see the progress change from 0% to 50%</li>
          <li>Then go to My Learning and the button should show "Resume Course"</li>
        </ol>
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>What this function does:</strong></p>
        <ul className="list-disc ml-5">
          <li>Counts completed lessons for a user in a course</li>
          <li>Calculates progress percentage (completed/total * 100)</li>
          <li>Updates the course_enrollments table with the new percentage</li>
          <li>Marks course as completed when progress reaches 100%</li>
        </ul>
      </div>
    </div>
  );
}
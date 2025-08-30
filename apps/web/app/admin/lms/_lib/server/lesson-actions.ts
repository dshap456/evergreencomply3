'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const UpdateLessonSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  content_type: z.enum(['video', 'text', 'quiz']),
  order_index: z.number().min(0),
  is_final_quiz: z.boolean().optional(),
  video_url: z.string().optional().nullable(),
  language: z.enum(['en', 'es']).optional(),
});

export const updateLessonAction = enhanceAction(
  async function (data) {
    console.log('🔄 UpdateLessonAction: Received data:', {
      id: data.id,
      title: data.title,
      description: data.description,
      content_type: data.content_type,
      order_index: data.order_index,
      is_final_quiz: data.is_final_quiz,
      video_url: data.video_url,
      language: data.language
    });
    
    const client = getSupabaseServerAdminClient();

    console.log('🔄 UpdateLessonAction: Updating lesson in database...');

    const updateData: any = {
      title: data.title,
      description: data.description,
      content_type: data.content_type,
      order_index: data.order_index,
      is_final_quiz: data.is_final_quiz,
      updated_at: new Date().toISOString(),
    };

    // Include language if provided
    if (data.language !== undefined) {
      updateData.language = data.language;
    }

    // Only include video fields if they're provided (preserves existing data)
    if (data.video_url !== undefined) {
      updateData.video_url = data.video_url;
    }

    const { error } = await client
      .from('lessons')
      .update(updateData)
      .eq('id', data.id);

    if (error) {
      console.error('❌ UpdateLessonAction: Database error:', error);
      throw new Error(`Failed to update lesson: ${error.message}`);
    }

    console.log('✅ UpdateLessonAction: Lesson updated successfully');
    return { success: true };
  },
  {
    auth: true,
    schema: UpdateLessonSchema,
  }
);

const CreateLessonSchema = z.object({
  module_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  content_type: z.enum(['video', 'text', 'quiz']),
  order_index: z.number().min(0),
  is_final_quiz: z.boolean().optional(),
  language: z.enum(['en', 'es']),
});

export const createLessonAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    console.log('🔄 CreateLessonAction: Creating lesson in database...', {
      module_id: data.module_id,
      title: data.title,
      content_type: data.content_type,
      order_index: data.order_index
    });

    const { data: lesson, error } = await client
      .from('lessons')
      .insert({
        module_id: data.module_id,
        title: data.title,
        description: data.description,
        content_type: data.content_type,
        order_index: data.order_index,
        is_final_quiz: data.is_final_quiz || false,
        language: data.language,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ CreateLessonAction: Database error:', error);
      throw new Error(`Failed to create lesson: ${error.message}`);
    }

    console.log('✅ CreateLessonAction: Lesson created successfully:', lesson);
    return { success: true, lesson };
  },
  {
    auth: true,
    schema: CreateLessonSchema,
  }
);

const DeleteLessonSchema = z.object({
  id: z.string().uuid(),
});

export const deleteLessonAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    const { error } = await client
      .from('lessons')
      .delete()
      .eq('id', data.id);

    if (error) {
      throw new Error(`Failed to delete lesson: ${error.message}`);
    }

    return { success: true };
  },
  {
    auth: true,
    schema: DeleteLessonSchema,
  }
);

const SaveQuizDataSchema = z.object({
  lessonId: z.string().uuid(),
  language: z.enum(['en', 'es']).optional(),
  quizData: z.object({
    id: z.string().optional(),
    title: z.string(),
    description: z.string(),
    passing_score: z.number().min(0).max(100),
    time_limit_minutes: z.number().optional().nullable(),
    questions: z.array(z.object({
      id: z.string(),
      question_text: z.string().min(1),
      question_type: z.enum(['multiple_choice', 'true_false', 'open_ended']),
      order_index: z.number(),
      options: z.array(z.object({
        id: z.string(),
        option_text: z.string(),
        is_correct: z.boolean(),
        order_index: z.number()
      })),
      correct_answer: z.string().optional(),
      explanation: z.string().optional().nullable(),
      points: z.number().min(1)
    }))
  })
});

// Load quiz data for a lesson
const LoadQuizDataSchema = z.object({
  lessonId: z.string().uuid(),
});

export const loadQuizDataAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();
    
    console.log('🔄 LoadQuizDataAction: Loading quiz data for lesson:', data.lessonId);
    
    try {
      // Load quiz questions for this lesson
      const { data: questions, error } = await client
        .from('quiz_questions')
        .select('*')
        .eq('lesson_id', data.lessonId)
        .order('order_index', { ascending: true });
        
      if (error) {
        console.error('❌ LoadQuizDataAction: Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ LoadQuizDataAction: Found quiz questions:', {
        count: questions?.length || 0,
        questions: questions?.map(q => ({ id: q.id, question: q.question, type: q.question_type })) || []
      });
      
      return { success: true, questions: questions || [] };
      
    } catch (error) {
      console.error('❌ LoadQuizDataAction: Unexpected error:', error);
      throw error;
    }
  },
  {
    auth: true,
    schema: LoadQuizDataSchema,
  }
);

// Simple test action to check if server actions work at all
const TestQuizSaveSchema = z.object({
  lessonId: z.string().uuid(),
});

export const testQuizSaveAction = enhanceAction(
  async function (data) {
    console.log('🔄 TestQuizSaveAction: Simple test action called with lessonId:', data.lessonId);
    
    try {
      const client = getSupabaseServerAdminClient();
      
      // Just try to read the lesson to make sure database connection works
      const { data: lesson, error } = await client
        .from('lessons')
        .select('id, title')
        .eq('id', data.lessonId)
        .single();
        
      if (error) {
        console.error('❌ TestQuizSaveAction: Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ TestQuizSaveAction: Found lesson:', lesson);
      return { success: true, lesson };
      
    } catch (error) {
      console.error('❌ TestQuizSaveAction: Unexpected error:', error);
      throw error;
    }
  },
  {
    auth: true,
    schema: TestQuizSaveSchema,
  }
);

export const saveQuizDataAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    console.log('🔄 SaveQuizDataAction: Received data for validation:', {
      lessonId: data.lessonId,
      language: data.language || 'en',
      quizData: {
        title: data.quizData.title,
        description: data.quizData.description,
        passing_score: data.quizData.passing_score,
        time_limit_minutes: data.quizData.time_limit_minutes,
        questionsCount: data.quizData.questions?.length || 0,
        firstQuestion: data.quizData.questions?.[0] || null
      }
    });

    console.log('🔄 SaveQuizDataAction: Saving quiz data to database...');

    try {
      // First, delete existing quiz questions for this lesson
      const { error: deleteError } = await client
        .from('quiz_questions')
        .delete()
        .eq('lesson_id', data.lessonId);

      if (deleteError) {
        console.error('❌ SaveQuizDataAction: Failed to delete existing questions:', deleteError);
        throw new Error(`Failed to delete existing quiz questions: ${deleteError.message}`);
      }

      // If there are questions to save, insert them
      if (data.quizData.questions.length > 0) {
        // Transform admin quiz format to database format
        const questionsData = data.quizData.questions.map((question) => {
          let correct_answer = question.correct_answer;
          
          // For multiple choice, find the correct answer from options
          if (question.question_type === 'multiple_choice') {
            const correctOption = question.options.find(opt => opt.is_correct);
            correct_answer = correctOption?.option_text || '';
          }

          return {
            lesson_id: data.lessonId,
            question: question.question_text,
            question_type: question.question_type,
            options: question.question_type === 'multiple_choice' 
              ? question.options.map(opt => opt.option_text)
              : [],
            correct_answer: correct_answer || '',
            points: question.points,
            order_index: question.order_index,
            language: data.language || 'en',
          };
        });

        console.log('🔄 SaveQuizDataAction: Inserting quiz questions with data:', {
          count: questionsData.length,
          firstQuestion: questionsData[0],
          language: data.language || 'en'
        });

        const { error: insertError } = await client
          .from('quiz_questions')
          .insert(questionsData);

        if (insertError) {
          console.error('❌ SaveQuizDataAction: Failed to insert quiz questions:', insertError);
          console.error('❌ Full error details:', JSON.stringify(insertError, null, 2));
          throw new Error(`Failed to save quiz questions: ${insertError.message}`);
        }
      }

      // Update lesson with quiz metadata
      const { error: lessonError } = await client
        .from('lessons')
        .update({
          passing_score: data.quizData.passing_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.lessonId);

      if (lessonError) {
        console.error('❌ SaveQuizDataAction: Failed to update lesson:', lessonError);
        throw new Error(`Failed to update lesson: ${lessonError.message}`);
      }

      console.log('✅ SaveQuizDataAction: Quiz data saved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ SaveQuizDataAction: Unexpected error:', error);
      throw error;
    }
  },
  {
    auth: true,
    schema: SaveQuizDataSchema,
  }
);
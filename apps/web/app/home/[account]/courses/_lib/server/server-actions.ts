'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';

const CreateCourseSchema = z.object({
  account: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0),
});

const UpdateCourseSchema = z.object({
  account: z.string().min(1),
  courseId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0),
  is_published: z.boolean().optional(),
  sequential_completion: z.boolean().optional(),
  passing_score: z.number().min(0).max(100).optional(),
});

const CreateModuleSchema = z.object({
  account: z.string().min(1),
  courseId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  order_index: z.number().int().min(0),
});

const CreateLessonSchema = z.object({
  account: z.string().min(1),
  moduleId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  content_type: z.enum(['video', 'text', 'quiz', 'asset']),
  content: z.string().optional(),
  video_url: z.string().url().optional().or(z.literal('')),
  asset_url: z.string().url().optional().or(z.literal('')),
  order_index: z.number().int().min(0),
  is_final_quiz: z.boolean().optional(),
  passing_score: z.number().min(0).max(100).optional(),
});

const UpdateLessonSchema = z.object({
  account: z.string().min(1),
  lessonId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  content_type: z.enum(['video', 'text', 'quiz', 'asset']),
  content: z.string().optional(),
  video_url: z.string().url().optional().or(z.literal('')),
  asset_url: z.string().url().optional().or(z.literal('')),
  order_index: z.number().int().min(0),
  is_final_quiz: z.boolean().optional(),
  passing_score: z.number().min(0).max(100).optional(),
});

const QuizQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1),
  question_type: z.string().default('multiple_choice'),
  options: z.array(z.string().min(1)),
  correct_answer: z.string().min(1),
  points: z.number().min(1),
  order_index: z.number().int().min(0),
});

const CreateQuizQuestionsSchema = z.object({
  account: z.string().min(1),
  lessonId: z.string().uuid(),
  questions: z.array(QuizQuestionSchema).min(1),
});

const UpdateQuizQuestionsSchema = z.object({
  account: z.string().min(1),
  lessonId: z.string().uuid(),
  questions: z.array(QuizQuestionSchema).min(1),
});

export const createCourseAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const api = createTeamAccountsApi(client);
    
    // Get team account
    const teamAccount = await api.getTeamAccount(data.account);
    
    // Check permissions
    const hasPermission = await api.hasPermission({
      accountId: teamAccount.id,
      userId: user.id,
      permission: 'settings.manage',
    });

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Create course
    const { data: course, error } = await client
      .from('courses')
      .insert({
        account_id: teamAccount.id,
        title: data.title,
        description: data.description || null,
        sku: data.sku || null,
        price: data.price,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath(`/home/${data.account}/courses`);
    
    return { data: course };
  },
  {
    auth: true,
    schema: CreateCourseSchema,
  },
);

export const updateCourseAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const api = createTeamAccountsApi(client);
    
    // Get team account
    const teamAccount = await api.getTeamAccount(data.account);
    
    // Check permissions
    const hasPermission = await api.hasPermission({
      accountId: teamAccount.id,
      userId: user.id,
      permission: 'settings.manage',
    });

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Update course
    const { data: course, error } = await client
      .from('courses')
      .update({
        title: data.title,
        description: data.description || null,
        sku: data.sku || null,
        price: data.price,
        is_published: data.is_published,
        sequential_completion: data.sequential_completion,
        passing_score: data.passing_score,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.courseId)
      .eq('account_id', teamAccount.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath(`/home/${data.account}/courses`);
    revalidatePath(`/home/${data.account}/courses/${data.courseId}`);
    
    return { data: course };
  },
  {
    auth: true,
    schema: UpdateCourseSchema,
  },
);

export const createModuleAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const api = createTeamAccountsApi(client);
    
    // Get team account
    const teamAccount = await api.getTeamAccount(data.account);
    
    // Check permissions
    const hasPermission = await api.hasPermission({
      accountId: teamAccount.id,
      userId: user.id,
      permission: 'settings.manage',
    });

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Verify course belongs to this account
    const { data: course } = await client
      .from('courses')
      .select('id')
      .eq('id', data.courseId)
      .eq('account_id', teamAccount.id)
      .single();

    if (!course) {
      throw new Error('Course not found');
    }

    // Create module
    const { data: module, error } = await client
      .from('course_modules')
      .insert({
        course_id: data.courseId,
        title: data.title,
        description: data.description || null,
        order_index: data.order_index,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath(`/home/${data.account}/courses/${data.courseId}`);
    
    return { data: module };
  },
  {
    auth: true,
    schema: CreateModuleSchema,
  },
);

export const createLessonAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const api = createTeamAccountsApi(client);
    
    // Get team account
    const teamAccount = await api.getTeamAccount(data.account);
    
    // Check permissions
    const hasPermission = await api.hasPermission({
      accountId: teamAccount.id,
      userId: user.id,
      permission: 'settings.manage',
    });

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Verify module belongs to this account's course
    const { data: module } = await client
      .from('course_modules')
      .select('id, course_id, courses!inner(account_id)')
      .eq('id', data.moduleId)
      .eq('courses.account_id', teamAccount.id)
      .single();

    if (!module) {
      throw new Error('Module not found');
    }

    // Create lesson
    const { data: lesson, error } = await client
      .from('lessons')
      .insert({
        module_id: data.moduleId,
        title: data.title,
        description: data.description || null,
        content_type: data.content_type,
        content: data.content || null,
        video_url: data.video_url || null,
        asset_url: data.asset_url || null,
        order_index: data.order_index,
        is_final_quiz: data.is_final_quiz || false,
        passing_score: data.passing_score || 80,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath(`/home/${data.account}/courses/${module.course_id}`);
    
    return { data: lesson };
  },
  {
    auth: true,
    schema: CreateLessonSchema,
  },
);

export const updateLessonAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const api = createTeamAccountsApi(client);
    
    // Get team account
    const teamAccount = await api.getTeamAccount(data.account);
    
    // Check permissions
    const hasPermission = await api.hasPermission({
      accountId: teamAccount.id,
      userId: user.id,
      permission: 'settings.manage',
    });

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Verify lesson belongs to this account's course
    const { data: lesson } = await client
      .from('lessons')
      .select('id, course_modules!inner(course_id, courses!inner(account_id))')
      .eq('id', data.lessonId)
      .eq('course_modules.courses.account_id', teamAccount.id)
      .single();

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Update lesson
    const { data: updatedLesson, error } = await client
      .from('lessons')
      .update({
        title: data.title,
        description: data.description || null,
        content_type: data.content_type,
        content: data.content || null,
        video_url: data.video_url || null,
        asset_url: data.asset_url || null,
        order_index: data.order_index,
        is_final_quiz: data.is_final_quiz || false,
        passing_score: data.passing_score || 80,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.lessonId)
      .select('*, course_modules!inner(course_id)')
      .single();

    if (error) {
      throw error;
    }

    revalidatePath(`/home/${data.account}/courses/${updatedLesson.course_modules.course_id}`);
    
    return { data: updatedLesson };
  },
  {
    auth: true,
    schema: UpdateLessonSchema,
  },
);

export const createQuizQuestionsAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const api = createTeamAccountsApi(client);
    
    // Get team account
    const teamAccount = await api.getTeamAccount(data.account);
    
    // Check permissions
    const hasPermission = await api.hasPermission({
      accountId: teamAccount.id,
      userId: user.id,
      permission: 'settings.manage',
    });

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Verify lesson belongs to this account's course
    const { data: lesson } = await client
      .from('lessons')
      .select('id, course_modules!inner(course_id, courses!inner(account_id))')
      .eq('id', data.lessonId)
      .eq('course_modules.courses.account_id', teamAccount.id)
      .single();

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Create quiz questions
    const questionsData = data.questions.map((question, index) => ({
      lesson_id: data.lessonId,
      question: question.question,
      question_type: question.question_type,
      options: question.options,
      correct_answer: question.correct_answer,
      points: question.points,
      order_index: question.order_index,
    }));

    const { data: questions, error } = await client
      .from('quiz_questions')
      .insert(questionsData)
      .select();

    if (error) {
      throw error;
    }

    revalidatePath(`/home/${data.account}/courses/${lesson.course_modules.course_id}`);
    
    return { data: questions };
  },
  {
    auth: true,
    schema: CreateQuizQuestionsSchema,
  },
);

export const updateQuizQuestionsAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const api = createTeamAccountsApi(client);
    
    // Get team account
    const teamAccount = await api.getTeamAccount(data.account);
    
    // Check permissions
    const hasPermission = await api.hasPermission({
      accountId: teamAccount.id,
      userId: user.id,
      permission: 'settings.manage',
    });

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Verify lesson belongs to this account's course
    const { data: lesson } = await client
      .from('lessons')
      .select('id, course_modules!inner(course_id, courses!inner(account_id))')
      .eq('id', data.lessonId)
      .eq('course_modules.courses.account_id', teamAccount.id)
      .single();

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Delete existing questions
    await client
      .from('quiz_questions')
      .delete()
      .eq('lesson_id', data.lessonId);

    // Create new questions
    const questionsData = data.questions.map((question, index) => ({
      lesson_id: data.lessonId,
      question: question.question,
      question_type: question.question_type,
      options: question.options,
      correct_answer: question.correct_answer,
      points: question.points,
      order_index: question.order_index,
    }));

    const { data: questions, error } = await client
      .from('quiz_questions')
      .insert(questionsData)
      .select();

    if (error) {
      throw error;
    }

    revalidatePath(`/home/${data.account}/courses/${lesson.course_modules.course_id}`);
    
    return { data: questions };
  },
  {
    auth: true,
    schema: UpdateQuizQuestionsSchema,
  },
);
-- Add explanation column to quiz_questions table for answer explanations

ALTER TABLE public.quiz_questions 
ADD COLUMN IF NOT EXISTS explanation TEXT;

COMMENT ON COLUMN public.quiz_questions.explanation IS 'Optional explanation for why the answer is correct';
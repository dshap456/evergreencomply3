-- Fix has_course_access function to work with enrollment-based system
-- Since purchases directly create enrollments, we don't need to check orders table

CREATE OR REPLACE FUNCTION public.has_course_access(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
      v_course RECORD;
      v_has_enrollment BOOLEAN;
      v_has_seat BOOLEAN;
  BEGIN
      -- Get course details
      SELECT id, price, requires_purchase
      INTO v_course
      FROM public.courses
      WHERE id = p_course_id;

      IF NOT FOUND THEN
          RETURN FALSE;
      END IF;

      -- If course doesn't require purchase (free), allow access
      IF NOT v_course.requires_purchase OR v_course.price IS NULL OR v_course.price = 0 THEN
          RETURN TRUE;
      END IF;

      -- Check if user is already enrolled
      -- In this system, enrollment = has access (created by purchase or manual enrollment)
      SELECT EXISTS(
          SELECT 1 FROM public.course_enrollments
          WHERE user_id = p_user_id AND course_id = p_course_id
      ) INTO v_has_enrollment;

      IF v_has_enrollment THEN
          RETURN TRUE;
      END IF;

      -- Check if user has access through team seats
      SELECT EXISTS(
          SELECT 1
          FROM public.course_seats cs
          JOIN public.accounts_memberships am ON cs.account_id = am.account_id
          WHERE am.user_id = p_user_id
          AND cs.course_id = p_course_id
          AND cs.total_seats > (
              SELECT COUNT(*)
              FROM public.course_enrollments ce
              WHERE ce.course_id = cs.course_id
              AND ce.user_id IN (
                  SELECT user_id 
                  FROM public.accounts_memberships 
                  WHERE account_id = cs.account_id
              )
          )
      ) INTO v_has_seat;

      RETURN v_has_seat;
  END;
$$;
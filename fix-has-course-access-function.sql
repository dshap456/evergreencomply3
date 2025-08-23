-- Fix has_course_access function to not depend on orders table
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.has_course_access(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
      v_course RECORD;
      v_user_account_id UUID;
      v_has_enrollment BOOLEAN;
      v_has_seat BOOLEAN;
  BEGIN
      -- Get course details
      SELECT id, price, billing_product_id, requires_purchase
      INTO v_course
      FROM public.courses
      WHERE id = p_course_id;

      IF NOT FOUND THEN
          RETURN FALSE;
      END IF;

      -- If course is free or doesn't require purchase, allow access
      IF NOT v_course.requires_purchase OR v_course.price IS NULL OR v_course.price = 0 THEN
          RETURN TRUE;
      END IF;

      -- Check if user is already enrolled
      SELECT EXISTS(
          SELECT 1 FROM public.course_enrollments
          WHERE user_id = p_user_id AND course_id = p_course_id
      ) INTO v_has_enrollment;

      IF v_has_enrollment THEN
          RETURN TRUE;
      END IF;

      -- Get user's personal account ID
      SELECT id INTO v_user_account_id
      FROM public.accounts
      WHERE id = p_user_id AND is_personal_account = true;

      -- Check if user has access through team seats
      SELECT EXISTS(
          SELECT 1
          FROM public.course_seats cs
          JOIN public.accounts_memberships am ON cs.account_id = am.account_id
          WHERE am.user_id = p_user_id
          AND cs.course_id = p_course_id
          AND public.get_available_course_seats(cs.account_id, cs.course_id) > 0
      ) INTO v_has_seat;

      -- For now, return true for testing if user is support@evergreencomply.com
      -- This is temporary until we have proper payment processing
      IF p_user_id = 'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7' THEN
          RETURN TRUE;
      END IF;

      RETURN v_has_seat;
  END;
$$;
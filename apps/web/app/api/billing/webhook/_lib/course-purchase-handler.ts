import { SupabaseClient } from '@supabase/supabase-js';

import { UpsertOrderParams } from '@kit/billing/types';
import { getLogger } from '@kit/shared/logger';
import { Database } from '@kit/supabase/database';

export interface CourseOrderMetadata {
  courseId?: string;
  courseTitle?: string;
  purchaseType?: 'individual' | 'team';
  quantity?: number;
}

/**
 * Handles course purchases from Stripe webhooks
 * Automatically enrolls individuals or creates team seats
 */
export async function handleCoursePurchase(
  order: UpsertOrderParams,
  customerId: string,
  adminClient: SupabaseClient<Database>,
) {
  const logger = await getLogger();
  const ctx = {
    namespace: 'billing.course-purchase',
    orderId: order.target_order_id,
    accountId: order.target_account_id,
    customerId,
  };

  logger.info(ctx, 'Processing course purchase order...');

  try {
    // Process each line item in the order
    const results = await Promise.all(
      order.line_items.map(async (item) => {
        const itemCtx = {
          ...ctx,
          productId: item.product_id,
          quantity: item.quantity,
        };

        logger.info(itemCtx, 'Processing line item for potential course purchase...');

        // Call the database function to process the course purchase
        const { data, error } = await adminClient.rpc('process_course_purchase', {
          p_order_id: order.target_order_id,
          p_account_id: order.target_account_id,
          p_product_id: item.product_id,
          p_quantity: item.quantity || 1,
        });

        if (error) {
          logger.error(
            { ...itemCtx, error },
            'Failed to process course purchase',
          );
          throw error;
        }

        if (data?.success) {
          logger.info(
            { ...itemCtx, result: data },
            'Successfully processed course purchase',
          );
        }

        return data;
      }),
    );

    // Filter out non-course products
    const courseResults = results.filter(
      (result) => result?.type === 'individual_enrollment' || result?.type === 'team_seats',
    );

    if (courseResults.length > 0) {
      logger.info(
        { ...ctx, courseResults },
        'Course purchases processed successfully',
      );

      // TODO: Send confirmation emails for course purchases
      // This will be implemented in a later step
    }

    return { success: true, results: courseResults };
  } catch (error) {
    logger.error(
      { ...ctx, error },
      'Failed to handle course purchase',
    );
    throw error;
  }
}
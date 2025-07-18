import {
  getOrder,
  getSubscription,
  getVariant,
} from '@lemonsqueezy/lemonsqueezy.js';

import { BillingWebhookHandlerService, type PlanTypeMap } from '@kit/billing';
import { getLogger } from '@kit/shared/logger';
import { Database, Enums } from '@kit/supabase/database';

import { getLemonSqueezyEnv } from '../schema/lemon-squeezy-server-env.schema';
import { OrderWebhook } from '../types/order-webhook';
import { SubscriptionInvoiceWebhook } from '../types/subscription-invoice-webhook';
import { SubscriptionWebhook } from '../types/subscription-webhook';
import { initializeLemonSqueezyClient } from './lemon-squeezy-sdk';
import { createLemonSqueezySubscriptionPayloadBuilderService } from './lemon-squeezy-subscription-payload-builder.service';
import { createHmac } from './verify-hmac';

type UpsertSubscriptionParams =
  Database['public']['Functions']['upsert_subscription']['Args'] & {
    line_items: Array<LineItem>;
  };

type UpsertOrderParams =
  Database['public']['Functions']['upsert_order']['Args'];

type BillingProvider = Enums<'billing_provider'>;

interface LineItem {
  id: string;
  quantity: number;
  subscription_id: string;
  subscription_item_id: string;
  product_id: string;
  variant_id: string;
  price_amount: number | null | undefined;
  interval: string;
  interval_count: number;
  type: 'flat' | 'metered' | 'per_seat' | undefined;
}

type OrderStatus = 'pending' | 'failed' | 'paid' | 'refunded';

export class LemonSqueezyWebhookHandlerService
  implements BillingWebhookHandlerService
{
  private readonly provider: BillingProvider = 'lemon-squeezy';

  private readonly namespace = 'billing.lemon-squeezy';

  constructor(private readonly planTypesMap: PlanTypeMap) {}

  /**
   * @description Verifies the webhook signature - should throw an error if the signature is invalid
   */
  async verifyWebhookSignature(request: Request) {
    const logger = await getLogger();

    // get the event name and signature from the headers
    const eventName = request.headers.get('x-event-name');
    const signature = request.headers.get('x-signature') as string;

    // clone the request so we can read the body twice
    const reqClone = request.clone();
    const body = (await request.json()) as SubscriptionWebhook | OrderWebhook;
    const rawBody = await reqClone.text();

    // if no signature is found, throw an error
    if (!signature) {
      logger.error(
        {
          eventName,
        },
        `Signature header not found`,
      );

      throw new Error('Signature header not found');
    }

    const isValid = await isSigningSecretValid(rawBody, signature);

    // if the signature is invalid, throw an error
    if (!isValid) {
      logger.error(
        {
          eventName,
        },
        `Signing secret is invalid`,
      );

      throw new Error('Signing secret is invalid');
    }

    return body;
  }

  async handleWebhookEvent(
    event: OrderWebhook | SubscriptionWebhook | SubscriptionInvoiceWebhook,
    params: {
      onCheckoutSessionCompleted: (
        data: UpsertSubscriptionParams | UpsertOrderParams,
      ) => Promise<unknown>;
      onSubscriptionUpdated: (
        data: UpsertSubscriptionParams,
      ) => Promise<unknown>;
      onSubscriptionDeleted: (subscriptionId: string) => Promise<unknown>;
      onPaymentSucceeded: (sessionId: string) => Promise<unknown>;
      onPaymentFailed: (sessionId: string) => Promise<unknown>;
      onInvoicePaid: (
        data: UpsertSubscriptionParams | UpsertOrderParams,
      ) => Promise<unknown>;
      onEvent?: (event: unknown) => Promise<unknown>;
    },
  ) {
    const eventName = event.meta.event_name;

    switch (eventName) {
      case 'order_created': {
        const result = await this.handleOrderCompleted(
          event as OrderWebhook,
          params.onCheckoutSessionCompleted,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'subscription_created': {
        const result = await this.handleSubscriptionCreatedEvent(
          event as SubscriptionWebhook,
          params.onSubscriptionUpdated,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'subscription_updated': {
        const result = await this.handleSubscriptionUpdatedEvent(
          event as SubscriptionWebhook,
          params.onSubscriptionUpdated,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'subscription_expired': {
        const result = await this.handleSubscriptionDeletedEvent(
          event as SubscriptionWebhook,
          params.onSubscriptionDeleted,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'subscription_payment_success': {
        const result = await this.handleInvoicePaid(
          event as SubscriptionInvoiceWebhook,
          params.onInvoicePaid,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      default: {
        // handle user-supplied handler
        if (params.onEvent) {
          return params.onEvent(event);
        }

        const logger = await getLogger();

        logger.debug(
          {
            eventType: eventName,
            name: this.namespace,
          },
          `Unhandled Lemon Squeezy event type`,
        );

        return;
      }
    }
  }

  private async handleOrderCompleted(
    event: OrderWebhook,
    onCheckoutCompletedCallback: (
      data: UpsertSubscriptionParams | UpsertOrderParams,
    ) => Promise<unknown>,
  ) {
    await initializeLemonSqueezyClient();

    // we fetch the variant to check if the order is a subscription
    // if Lemon Squeezy was able to discriminate between orders and subscriptions
    // it would be better to use that information. But for now, we need to fetch the variant
    const variantId = event.data.attributes.first_order_item.variant_id;
    const { data } = await getVariant(variantId);

    // if the order is a subscription
    // we handle it in the subscription created event
    if (data?.data.attributes.is_subscription) {
      return;
    }

    const attrs = event.data.attributes;

    const orderId = attrs.first_order_item.order_id;
    const accountId = event.meta.custom_data.account_id.toString();
    const customerId = attrs.customer_id.toString();
    const status = this.getOrderStatus(attrs.status as OrderStatus);

    const payload: UpsertOrderParams = {
      target_account_id: accountId,
      target_customer_id: customerId,
      target_order_id: orderId.toString(),
      billing_provider: this.provider,
      status,
      currency: attrs.currency,
      total_amount: attrs.first_order_item.price,
      line_items: [
        {
          id: attrs.first_order_item.id.toString(),
          product_id: attrs.first_order_item.product_id.toString(),
          variant_id: attrs.first_order_item.variant_id.toString(),
          price_amount: attrs.first_order_item.price,
          quantity: 1,
          type: this.getLineItemType(attrs.first_order_item.variant_id),
        },
      ],
    };

    return onCheckoutCompletedCallback(payload);
  }

  private async handleSubscriptionCreatedEvent(
    event: SubscriptionWebhook,
    onSubscriptionCreatedEvent: (
      data: UpsertSubscriptionParams,
    ) => Promise<unknown>,
  ) {
    await initializeLemonSqueezyClient();

    const subscription = event.data.attributes;
    const orderId = subscription.order_id;
    const subscriptionId = event.data.id;
    const accountId = event.meta.custom_data.account_id;
    const customerId = subscription.customer_id.toString();
    const status = subscription.status;
    const variantId = subscription.variant_id;
    const productId = subscription.product_id;
    const createdAt = subscription.created_at;
    const endsAt = subscription.ends_at;
    const renewsAt = subscription.renews_at;
    const trialEndsAt = subscription.trial_ends_at;

    const { data: order, error } = await getOrder(orderId);

    if (error ?? !order) {
      const logger = await getLogger();

      logger.warn(
        {
          orderId,
          subscriptionId,
          error,
          name: this.namespace,
        },
        'Failed to fetch order',
      );

      throw new Error('Failed to fetch order');
    }

    const priceAmount = order?.data.attributes.first_order_item.price ?? 0;
    const firstSubscriptionItem = subscription.first_subscription_item;

    const lineItems = [
      {
        id: firstSubscriptionItem.id.toString(),
        product: productId.toString(),
        variant: variantId.toString(),
        quantity: firstSubscriptionItem.quantity,
        priceAmount,
        type: this.getLineItemType(variantId),
      },
    ];

    const { interval, intervalCount } = getSubscriptionIntervalType(renewsAt);

    const payloadBuilderService =
      createLemonSqueezySubscriptionPayloadBuilderService();

    const payload = payloadBuilderService.build({
      customerId,
      id: subscriptionId,
      accountId,
      lineItems,
      status,
      interval,
      intervalCount,
      currency: order.data.attributes.currency,
      periodStartsAt: new Date(createdAt).getTime(),
      periodEndsAt: new Date(renewsAt ?? endsAt).getTime(),
      cancelAtPeriodEnd: subscription.cancelled,
      trialStartsAt: trialEndsAt ? new Date(createdAt).getTime() : null,
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt).getTime() : null,
    });

    return onSubscriptionCreatedEvent(payload);
  }

  private handleSubscriptionUpdatedEvent(
    event: SubscriptionWebhook,
    onSubscriptionUpdatedCallback: (
      subscription: UpsertSubscriptionParams,
    ) => Promise<unknown>,
  ) {
    return this.handleSubscriptionCreatedEvent(
      event,
      onSubscriptionUpdatedCallback,
    );
  }

  private handleSubscriptionDeletedEvent(
    subscription: SubscriptionWebhook,
    onSubscriptionDeletedCallback: (subscriptionId: string) => Promise<unknown>,
  ) {
    // Here we don't need to do anything, so we just return the callback

    return onSubscriptionDeletedCallback(subscription.data.id);
  }

  private async handleInvoicePaid(
    event: SubscriptionInvoiceWebhook,
    onInvoicePaidCallback: (
      subscription: UpsertSubscriptionParams,
    ) => Promise<unknown>,
  ) {
    await initializeLemonSqueezyClient();

    const attrs = event.data.attributes;
    const subscriptionId = event.data.id;
    const accountId = event.meta.custom_data.account_id;
    const customerId = attrs.customer_id.toString();
    const status = attrs.status;
    const createdAt = attrs.created_at;

    const { data: subscriptionResponse } =
      await getSubscription(subscriptionId);
    const subscription = subscriptionResponse?.data.attributes;

    if (!subscription) {
      const logger = await getLogger();

      logger.error(
        {
          subscriptionId,
          accountId,
          name: this.namespace,
        },
        'Failed to fetch subscription',
      );

      return;
    }

    const variantId = subscription.variant_id;
    const productId = subscription.product_id;
    const endsAt = subscription.ends_at;
    const renewsAt = subscription.renews_at;
    const trialEndsAt = subscription.trial_ends_at;
    const intervalCount = subscription.billing_anchor;
    const interval = intervalCount === 1 ? 'month' : 'year';

    const payloadBuilderService =
      createLemonSqueezySubscriptionPayloadBuilderService();

    const lineItemType = this.getLineItemType(variantId);

    const lineItems = [
      {
        id: subscription.order_item_id.toString(),
        product: productId.toString(),
        variant: variantId.toString(),
        quantity: subscription.first_subscription_item?.quantity ?? 1,
        priceAmount: attrs.total,
        type: lineItemType,
      },
    ];

    const payload = payloadBuilderService.build({
      customerId,
      id: subscriptionId,
      accountId,
      lineItems,
      status,
      interval,
      intervalCount,
      currency: attrs.currency,
      periodStartsAt: new Date(createdAt).getTime(),
      periodEndsAt: new Date(renewsAt ?? endsAt).getTime(),
      cancelAtPeriodEnd: subscription.cancelled,
      trialStartsAt: trialEndsAt ? new Date(createdAt).getTime() : null,
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt).getTime() : null,
    });

    return onInvoicePaidCallback(payload);
  }

  private getLineItemType(variantId: number) {
    const type = this.planTypesMap.get(variantId.toString());

    if (!type) {
      console.warn(
        {
          variantId,
        },
        'Line item type not found. Will be defaulted to "flat"',
      );

      return 'flat' as const;
    }

    return type;
  }

  private getOrderStatus(status: OrderStatus) {
    const statusMap = {
      paid: 'succeeded',
      pending: 'pending',
      failed: 'failed',
      refunded: 'failed',
    } satisfies Record<OrderStatus, UpsertOrderParams['status']>;

    return statusMap[status] ?? 'pending';
  }
}

async function isSigningSecretValid(rawBody: string, signatureHeader: string) {
  const { webhooksSecret } = getLemonSqueezyEnv();

  const { hex: digest } = await createHmac({
    key: webhooksSecret,
    data: rawBody,
  });

  const signature = Buffer.from(signatureHeader, 'utf8');

  return timingSafeEqual(digest, signature);
}

function timingSafeEqual(digest: string, signature: Buffer) {
  return digest.toString() === signature.toString();
}

function getSubscriptionIntervalType(renewsAt: string) {
  const renewalDate = new Date(renewsAt);
  const currentDate = new Date();

  // Calculate the difference in milliseconds
  const timeDifference = renewalDate.getTime() - currentDate.getTime();

  // Convert milliseconds to days
  const daysDifference = timeDifference / (1000 * 3600 * 24);

  if (daysDifference <= 32) {
    return {
      interval: 'month',
      intervalCount: 1,
    };
  }

  return {
    interval: 'year',
    intervalCount: 1,
  };
}

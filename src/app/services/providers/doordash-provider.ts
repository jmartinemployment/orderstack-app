import {
  DeliveryProvider,
  DeliveryContext,
  DeliveryQuote,
  DeliveryDispatchResult,
  DeliveryDriverInfo,
} from '../../models/delivery.model';

async function buildProviderError(response: Response, fallback: string): Promise<Error> {
  const contentType = response.headers.get('content-type') ?? '';
  let detail = '';

  if (contentType.includes('application/json')) {
    try {
      const body = await response.json() as { error?: string; message?: string };
      detail = body.error ?? body.message ?? '';
    } catch {
      detail = '';
    }
  } else {
    try {
      detail = (await response.text()).trim();
    } catch {
      detail = '';
    }
  }

  const message = detail || response.statusText || fallback;
  return new Error(`${message} (${response.status})`);
}

export class DoorDashDeliveryProvider implements DeliveryProvider {
  readonly type = 'doordash' as const;

  async requestQuote(orderId: string, context: DeliveryContext): Promise<DeliveryQuote> {
    const response = await fetch(
      `${context.apiUrl}/restaurant/${context.restaurantId}/delivery/quote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, provider: 'doordash' }),
      }
    );

    if (!response.ok) {
      throw await buildProviderError(response, 'Quote failed');
    }

    return response.json();
  }

  async acceptQuote(orderId: string, quoteId: string, context: DeliveryContext): Promise<DeliveryDispatchResult> {
    const response = await fetch(
      `${context.apiUrl}/restaurant/${context.restaurantId}/delivery/dispatch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, quoteId }),
      }
    );

    if (!response.ok) {
      throw await buildProviderError(response, 'Dispatch failed');
    }

    return response.json();
  }

  async cancelDelivery(orderId: string, deliveryExternalId: string, context: DeliveryContext): Promise<boolean> {
    const response = await fetch(
      `${context.apiUrl}/restaurant/${context.restaurantId}/delivery/cancel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, deliveryExternalId }),
      }
    );

    return response.ok;
  }

  async getStatus(orderId: string, deliveryExternalId: string, context: DeliveryContext): Promise<DeliveryDriverInfo> {
    const response = await fetch(
      `${context.apiUrl}/restaurant/${context.restaurantId}/delivery/status/${deliveryExternalId}`
    );

    if (!response.ok) {
      throw await buildProviderError(response, 'Status check failed');
    }

    return response.json();
  }

  destroy(): void {
    // No cleanup needed
  }
}

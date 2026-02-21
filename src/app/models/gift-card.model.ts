export type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'disabled';
export type GiftCardType = 'digital' | 'physical';

export interface GiftCard {
  id: string;
  restaurantId: string;
  code: string;
  type: GiftCardType;
  originalBalance: number;
  currentBalance: number;
  status: GiftCardStatus;
  purchasedBy: string | null;
  purchaserEmail: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  message: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardRedemption {
  id: string;
  giftCardId: string;
  orderId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface GiftCardFormData {
  type: GiftCardType;
  amount: number;
  recipientName?: string;
  recipientEmail?: string;
  purchaserEmail?: string;
  message?: string;
  expiresAt?: string;
}

export interface GiftCardBalanceCheck {
  code: string;
  currentBalance: number;
  status: GiftCardStatus;
  originalBalance: number;
  expiresAt: string | null;
}

export const GIFT_CARD_AMOUNTS = [10, 25, 50, 75, 100, 150, 200];

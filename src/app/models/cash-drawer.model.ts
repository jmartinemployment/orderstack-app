export type CashEventType = 'opening_float' | 'cash_sale' | 'cash_in' | 'cash_out' | 'tip_payout' | 'bank_deposit';

export interface CashEvent {
  id: string;
  type: CashEventType;
  amount: number;
  reason: string;
  performedBy: string;
  timestamp: Date;
  orderId?: string;
}

export interface CashDrawerSession {
  id: string;
  openedAt: Date;
  closedAt?: Date;
  openingFloat: number;
  events: CashEvent[];
  expectedCash: number;
  actualCash?: number;
  overShort?: number;
  closedBy?: string;
}

export function getCashEventLabel(type: CashEventType): string {
  switch (type) {
    case 'opening_float': return 'Opening Float';
    case 'cash_sale': return 'Cash Sale';
    case 'cash_in': return 'Cash In';
    case 'cash_out': return 'Cash Out';
    case 'tip_payout': return 'Tip Payout';
    case 'bank_deposit': return 'Bank Deposit';
  }
}

export function isCashInflow(type: CashEventType): boolean {
  return type === 'opening_float' || type === 'cash_sale' || type === 'cash_in';
}

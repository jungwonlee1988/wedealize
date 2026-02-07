export enum POStatus {
  RECEIVED = 'received',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum PIStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CANCELLED = 'cancelled',
}

export enum CreditStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  USED = 'used',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  PARTIAL = 'partial',
}

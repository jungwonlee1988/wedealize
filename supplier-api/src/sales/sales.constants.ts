export enum POStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
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

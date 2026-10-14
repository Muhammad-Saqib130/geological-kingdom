// Display names for order and payment states (shared by storefront and admin)
export const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PAYMENT_LABELS = {
  unpaid: 'Awaiting payment',
  awaiting_review: 'Proof under review',
  paid: 'Paid',
  rejected: 'Proof rejected',
}

export const METHOD_LABELS = {
  cod: 'Cash on delivery',
  bank: 'Bank transfer',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  card: 'Card',
}

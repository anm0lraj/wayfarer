import type { Money } from '@/types'

export function formatMoney({ amount, currency }: Money, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function inr(amount: number): Money {
  return { amount, currency: 'INR' }
}

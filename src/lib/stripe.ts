import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const STRIPE_PRICES = {
  STARTER: process.env.STRIPE_PRICE_STARTER!,
  PRO: process.env.STRIPE_PRICE_PRO!,
  ELITE: process.env.STRIPE_PRICE_ELITE!,
} as const

export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: 'Starter',
    price: 49,
    features: ['Swing signals only', '5-10 signals per week', 'Email support'],
  },
  PRO: {
    name: 'Professional',
    price: 99,
    features: ['Swing + Scalping signals', '20+ signals per week', 'Priority support', 'Telegram access'],
  },
  ELITE: {
    name: 'Elite',
    price: 199,
    features: ['All signals', 'Private Discord', '1-on-1 monthly call', 'Advanced analytics'],
  },
} as const

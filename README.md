# RedemptionFX Platform

A complete signal provider platform for forex/gold trading business. Built with Next.js 14, TypeScript, and modern web technologies.

## 🚀 Features

### Admin Dashboard
- **Signal Posting**: Create and distribute trading signals with one click
- **Member Management**: Track subscribers, manage subscriptions
- **Analytics**: Comprehensive performance tracking and reporting
- **Revenue Dashboard**: Monitor monthly recurring revenue and growth
- **Integrations**: Auto-post to Telegram, Discord, and email

### Member Dashboard
- **Live Signals Feed**: Real-time signal updates
- **Performance Tracking**: Personal trading statistics
- **Community Access**: Telegram and Discord integration
- **Subscription Management**: Easy plan upgrades/downgrades

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Payments**: Stripe Subscriptions
- **File Storage**: Vercel Blob
- **Hosting**: Vercel
- **Email**: Resend

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd redemptionfx-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   - Database URL (PostgreSQL)
   - Clerk authentication keys
   - Stripe API keys
   - Telegram bot token
   - Discord webhook URL
   - Vercel Blob token
   - Resend API key

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🗄 Database Schema

The platform uses the following main entities:

- **Users**: Admin and member accounts
- **Signals**: Trading signals with entry/exit points
- **Subscriptions**: Stripe subscription management
- **MemberTrades**: Track which signals members followed
- **Announcements**: Platform-wide communications
- **Performance**: Analytics and statistics

## 🔧 Configuration

### Clerk Authentication
1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy the publishable key and secret key to your `.env.local`

### Stripe Payments
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the dashboard
3. Create products and prices for your subscription tiers
4. Set up webhooks for subscription events

### Telegram Bot
1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Get the bot token and add it to your environment variables
4. Add the bot to your channel and get the channel ID

### Discord Integration
1. Create a webhook in your Discord server
2. Copy the webhook URL to your environment variables

## 📱 Usage

### For Admins
1. Sign up with an admin account
2. Configure integrations (Telegram, Discord, Stripe)
3. Post trading signals through the dashboard
4. Monitor member subscriptions and performance
5. View analytics and revenue reports

### For Members
1. Sign up and choose a subscription plan
2. Complete payment through Stripe
3. Access the member dashboard
4. Follow signals and track personal performance
5. Join Telegram/Discord communities

## 🎨 Branding

The platform uses a dark theme with:
- **Primary Color**: Red (#ef4444) - Phoenix theme
- **Accent Color**: Gold (#ffd700) - "King of Gold"
- **Background**: Black (#000000) with dark grays
- **Style**: Premium, professional, modern

## 📊 Subscription Tiers

- **Starter**: $49/month - Swing signals only
- **Professional**: $99/month - Swing + Scalping signals (Most Popular)
- **Elite**: $199/month - All signals + Private Discord + 1-on-1 calls

## 🔒 Security

- All API keys encrypted in database
- Environment variables for secrets
- HTTPS only
- Rate limiting on API endpoints
- Webhook signature verification
- Protected admin routes
- SQL injection prevention (Prisma)
- XSS prevention
- CSRF tokens

## 🚀 Deployment

The platform is optimized for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 📈 Analytics

Track comprehensive metrics:
- Signal performance (win rate, profit factor)
- Member engagement and retention
- Revenue growth and churn rates
- Trading pair performance
- Timeframe analysis

## 🤝 Support

For support or questions:
- Email: admin@redemptionfx.com
- Discord: [Your Discord Server]
- Telegram: [Your Telegram Channel]

## 📄 License

This project is proprietary software for RedemptionFX trading business.

---

**RedemptionFX** - Rise from ashes to gold 🐲

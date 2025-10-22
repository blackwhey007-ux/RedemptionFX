import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Star, Zap, Crown } from 'lucide-react'
import Link from 'next/link'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Choose Your <span className="text-yellow-400">Trading Plan</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Professional forex signals designed to help you succeed. 
            Start with our proven strategies and scale your trading.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <Card className="glass border-gray-600 relative">
              <CardHeader className="text-center pb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-white">Starter</CardTitle>
                <CardDescription className="text-gray-400">Perfect for beginners</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-white">$49</span>
                  <span className="text-gray-400 text-lg">/month</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Swing signals only</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>5-10 signals per week</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Email notifications</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Basic support</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Risk management included</span>
                  </li>
                </ul>
                <Button asChild className="w-full gradient-red text-white hover:opacity-90">
                  <Link href="/sign-up?plan=starter">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Professional Plan - Most Popular */}
            <Card className="glass border-red-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="gradient-red text-white px-6 py-2 text-sm font-semibold">
                  <Star className="w-4 h-4 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="text-center pb-8 pt-4">
                <div className="w-16 h-16 bg-gradient-red rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-white">Professional</CardTitle>
                <CardDescription className="text-gray-400">For serious traders</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-white">$99</span>
                  <span className="text-gray-400 text-lg">/month</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Swing + Scalping signals</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>20+ signals per week</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Telegram + Email alerts</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Advanced risk management</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Performance tracking</span>
                  </li>
                </ul>
                <Button asChild className="w-full gradient-red text-white hover:opacity-90">
                  <Link href="/sign-up?plan=pro">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Elite Plan */}
            <Card className="glass border-yellow-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="gradient-gold text-black px-6 py-2 text-sm font-semibold">
                  <Crown className="w-4 h-4 mr-1" />
                  VIP
                </Badge>
              </div>
              <CardHeader className="text-center pb-8 pt-4">
                <div className="w-16 h-16 bg-gradient-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-black" />
                </div>
                <CardTitle className="text-2xl text-white">Elite</CardTitle>
                <CardDescription className="text-gray-400">VIP experience</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-white">$199</span>
                  <span className="text-gray-400 text-lg">/month</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>All signal types</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Unlimited signals</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Private Discord server</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>1-on-1 monthly call</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Priority signal access</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Custom strategies</span>
                  </li>
                </ul>
                <Button asChild className="w-full gradient-gold text-black hover:opacity-90">
                  <Link href="/sign-up?plan=elite">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-black/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Compare Plans</h2>
            <p className="text-xl text-gray-400">
              See what's included in each plan
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full bg-gray-900 rounded-lg overflow-hidden">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-6 text-white font-semibold">Features</th>
                    <th className="text-center p-6 text-white font-semibold">Starter</th>
                    <th className="text-center p-6 text-white font-semibold">Professional</th>
                    <th className="text-center p-6 text-white font-semibold">Elite</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="p-6 text-gray-300">Swing Signals</td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-6 text-gray-300">Scalping Signals</td>
                    <td className="p-6 text-center">
                      <span className="text-gray-500">—</span>
                    </td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-6 text-gray-300">Signals per Week</td>
                    <td className="p-6 text-center text-gray-300">5-10</td>
                    <td className="p-6 text-center text-gray-300">20+</td>
                    <td className="p-6 text-center text-gray-300">Unlimited</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-6 text-gray-300">Telegram Access</td>
                    <td className="p-6 text-center">
                      <span className="text-gray-500">—</span>
                    </td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-6 text-gray-300">Private Discord</td>
                    <td className="p-6 text-center">
                      <span className="text-gray-500">—</span>
                    </td>
                    <td className="p-6 text-center">
                      <span className="text-gray-500">—</span>
                    </td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-6 text-gray-300">1-on-1 Calls</td>
                    <td className="p-6 text-center">
                      <span className="text-gray-500">—</span>
                    </td>
                    <td className="p-6 text-center">
                      <span className="text-gray-500">—</span>
                    </td>
                    <td className="p-6 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-6 text-gray-300">Support Level</td>
                    <td className="p-6 text-center text-gray-300">Basic</td>
                    <td className="p-6 text-center text-gray-300">Priority</td>
                    <td className="p-6 text-center text-gray-300">VIP</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-400">
              Everything you need to know about our signals
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-white">What's your win rate?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Our verified win rate is 78% over the past 6 years. We track every signal 
                  and provide transparent performance data to all members.
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-white">How quickly do I get signals?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Signals are sent instantly via Telegram, Discord, and email as soon as 
                  we identify a trading opportunity. You'll never miss a signal.
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-white">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Yes, you can cancel your subscription at any time. There are no long-term 
                  contracts or cancellation fees. You'll retain access until your current 
                  billing period ends.
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-white">Do you provide risk management?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Absolutely. Every signal includes stop loss and take profit levels. 
                  We also provide position sizing recommendations and risk management guidelines.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-red-900/20 to-yellow-900/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Start Trading?</h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join hundreds of successful traders who trust RedemptionFX for their trading signals
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-red text-white hover:opacity-90">
              <Link href="/sign-up">Start Your Journey</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black">
              <Link href="/sign-in">Already a Member?</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

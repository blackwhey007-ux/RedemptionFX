import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, TrendingUp, Shield, Users, Zap, Star, ArrowRight, BarChart3, Clock, Target, MessageCircle, Instagram, Youtube, Music2, Send, Hash, MessageSquare, Bot } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-red-500/30 shadow-2xl shadow-red-500/10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            {/* Desktop Logo */}
            <div className="hidden md:flex items-center">
              <div className="relative group">
                <div className="text-2xl font-black bg-gradient-to-r from-white via-red-100 to-yellow-200 bg-clip-text text-transparent tracking-wider">
                  REDEMPTION<span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">FX</span>
                </div>
                <div className="absolute inset-0 text-2xl font-black bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-red-500/20 bg-clip-text text-transparent tracking-wider blur-sm group-hover:blur-none transition-all duration-300">
                  REDEMPTION<span className="text-yellow-400/50">FX</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 via-yellow-600/20 to-red-600/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>

            {/* Mobile Centered Logo */}
            <div className="md:hidden flex-1 flex justify-center">
              <div className="relative group">
                <div className="text-xl font-black bg-gradient-to-r from-white via-red-100 to-yellow-200 bg-clip-text text-transparent tracking-wider">
                  REDEMPTION<span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">FX</span>
                </div>
                <div className="absolute inset-0 text-xl font-black bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-red-500/20 bg-clip-text text-transparent tracking-wider blur-sm group-hover:blur-none transition-all duration-300">
                  REDEMPTION<span className="text-yellow-400/50">FX</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105 relative group">
                Features
                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-yellow-500 group-hover:w-full transition-all duration-300"></div>
              </Link>
              <Link href="#pricing" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105 relative group">
                Pricing
                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-yellow-500 group-hover:w-full transition-all duration-300"></div>
              </Link>
              <Link href="/sign-in" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105 relative group">
                Sign In
                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-yellow-500 group-hover:w-full transition-all duration-300"></div>
              </Link>
              <Button asChild className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:scale-105">
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button asChild size="sm" className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:scale-105">
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-black to-orange-950/20" />
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                <Badge className="mb-6 bg-red-600/20 text-red-400 border-red-500/30 px-4 py-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full inline-block mr-2 animate-pulse" />
                  Live Trading Signals
                </Badge>
                
                <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                  <span className="block text-white">Rise From</span>
                  <span className="block bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                    Ashes to Gold
                  </span>
                </h1>
                
                <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                  Professional forex trading signals powered by institutional-grade analysis. 
                  <span className="text-white font-semibold"> Join 50+ successful traders</span> achieving consistent profits.
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="bg-gradient-to-br from-red-950/50 to-transparent p-4 rounded-xl border border-red-500/20">
                    <div className="text-3xl font-black text-white mb-1">78%</div>
                    <div className="text-sm text-gray-400">Win Rate</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-950/50 to-transparent p-4 rounded-xl border border-orange-500/20">
                    <div className="text-3xl font-black text-white mb-1">450+</div>
                    <div className="text-sm text-gray-400">Weekly Pips</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-950/50 to-transparent p-4 rounded-xl border border-yellow-500/20">
                    <div className="text-3xl font-black text-white mb-1">50+</div>
                    <div className="text-sm text-gray-400">Traders</div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button asChild size="lg" className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-lg px-8 py-6 shadow-2xl shadow-red-500/30 group">
                    <Link href="/sign-up" className="flex items-center">
                      Start Trading Now
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-2 border-red-500/50 text-white hover:bg-red-500/10 text-lg px-8 py-6">
                    <Link href="#pricing">View Pricing</Link>
                  </Button>
                </div>
              </div>

              {/* Right Content - Your RedemptionFX Logo with 3D Effects */}
              <div className="relative flex items-center justify-center">
                <div className="relative w-full max-w-lg aspect-square">
                  {/* Fire Background Effects */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Outer Fire Ring */}
                    <div className="absolute w-full h-full bg-gradient-to-r from-red-600/30 to-orange-600/30 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute w-4/5 h-4/5 bg-gradient-to-r from-orange-600/40 to-yellow-600/40 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <div className="absolute w-3/5 h-3/5 bg-gradient-to-r from-red-600/50 to-orange-600/50 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.6s' }} />
                    
                    {/* Fire Particles */}
          <div className="absolute inset-0">
                      {[...Array(8)].map((_, i) => (
              <div
                key={i}
                          className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                style={{
                            left: `${20 + (i * 10)}%`,
                            top: `${30 + (i * 8)}%`,
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: '2s'
                }}
              />
            ))}
          </div>
        </div>

                  {/* Video Logo with Responsive Design */}
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <div className="relative group">
                      {/* 3D Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-2xl animate-pulse group-hover:blur-3xl transition-all duration-500" />
                      
                      {/* Video Logo Container - Responsive Sizing */}
                      <div className="relative transform group-hover:scale-105 transition-all duration-700">
              <div className="relative">
                          {/* Premium glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-full blur-3xl animate-pulse group-hover:blur-2xl transition-all duration-700" />
                          
                          {/* Video Logo - Mobile: 240px, Desktop: 320px */}
                          <div className="relative z-10">
                            <div className="w-60 h-60 md:w-80 md:h-80 mx-auto rounded-full overflow-hidden">
                              <video
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover rounded-full"
                                style={{
                                  clipPath: 'circle(50% at 50% 50%)',
                                  filter: 'brightness(1.1) contrast(1.05) saturate(1.1)',
                                  boxShadow: '0 0 60px rgba(255, 255, 255, 0.1), 0 0 120px rgba(255, 255, 255, 0.05)'
                                }}
                                poster="/images/redemptionfx-logo.png"
                              >
                                <source src="/videos/redemptionfx-logo-intro.mp4" type="video/mp4" />
                                <source src="/videos/redemptionfx-logo-intro.webm" type="video/webm" />
                                {/* Fallback to static logo if video fails */}
                                <div
                                  className="w-full h-full bg-cover bg-center"
                                  style={{
                                    backgroundImage: 'url(/images/redemptionfx-logo.png)',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center top',
                                    clipPath: 'circle(50% at 50% 50%)'
                                  }}
                                />
                              </video>
                            </div>
                          </div>
                          
                          {/* Subtle floating particles */}
                          <div className="absolute inset-0 pointer-events-none">
                            {[...Array(6)].map((_, i) => (
                              <div
                                key={i}
                                className="absolute w-1 h-1 bg-white/30 rounded-full animate-ping"
                                style={{
                                  left: `${20 + (i * 15)}%`,
                                  top: `${25 + (i * 12)}%`,
                                  animationDelay: `${i * 0.8}s`,
                                  animationDuration: '3s'
                                }}
                              />
                            ))}
                          </div>
              </div>
            </div>

                      {/* Floating Fire Effects Around Logo - Responsive */}
                      <div className="absolute -top-2 -left-2 md:-top-4 md:-left-4 w-4 h-4 md:w-8 md:h-8 bg-red-500 rounded-full animate-ping opacity-60" style={{ animationDelay: '0.5s' }} />
                      <div className="absolute -top-1 -right-3 md:-top-2 md:-right-6 w-3 h-3 md:w-6 md:h-6 bg-orange-500 rounded-full animate-ping opacity-60" style={{ animationDelay: '1s' }} />
                      <div className="absolute -bottom-2 -left-1 md:-bottom-4 md:-left-2 w-3.5 h-3.5 md:w-7 md:h-7 bg-yellow-500 rounded-full animate-ping opacity-60" style={{ animationDelay: '1.5s' }} />
                      <div className="absolute -bottom-1 -right-2 md:-bottom-2 md:-right-4 w-2.5 h-2.5 md:w-5 md:h-5 bg-red-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '2s' }} />
                    </div>
              </div>


                </div>
              </div>
              </div>
              </div>
            </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-red-500/50 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-red-600/20 text-red-400 border-red-500/30">Why Choose Us</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Professional Trading Signals
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Institutional-grade analysis and proven results, delivered instantly
            </p>
            </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: TrendingUp,
                title: 'Verified Performance',
                description: '78% win rate with transparent tracking and real-time updates',
                color: 'green'
              },
              {
                icon: Zap,
                title: 'Instant Alerts',
                description: 'Get signals via Telegram, Discord, and email instantly',
                color: 'yellow'
              },
              {
                icon: Shield,
                title: 'Risk Management',
                description: 'Every signal includes SL/TP levels to protect your capital',
                color: 'blue'
              },
              {
                icon: Target,
                title: 'High Accuracy',
                description: 'Institutional-level analysis from 6 years of experience',
                color: 'red'
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-red-500/30 transition-all duration-300 group hover:scale-105">
                <CardHeader>
                  <div className={`w-14 h-14 bg-gradient-to-br from-${feature.color}-500/20 to-${feature.color}-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-7 h-7 text-${feature.color}-500`} />
                  </div>
                  <CardTitle className="text-xl text-white mb-2">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-400">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Me Section */}
      <section className="py-24 bg-gradient-to-b from-black to-red-950/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-red-600/20 text-red-400 border-red-500/30">About the Trader</Badge>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Meet Your <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Signal Provider</span>
              </h2>
        </div>
        
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Profile */}
              <div className="relative">
                <div className="relative w-full max-w-md mx-auto">
                  {/* Glowing Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-orange-600/20 rounded-3xl blur-2xl" />
                  
                  {/* Profile Card */}
                  <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center">
                      {/* Avatar */}
                      <div className="w-32 h-32 bg-gradient-to-br from-red-600 via-orange-600 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <span className="text-5xl font-black text-white">🔥</span>
          </div>
          
                      <h3 className="text-2xl font-bold text-white mb-2">RedemptionFX Trader</h3>
                      <p className="text-red-400 font-semibold mb-4">Professional Forex Analyst</p>
                      
                      {/* Experience Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-red-950/50 to-transparent p-3 rounded-xl border border-red-500/20">
                          <div className="text-2xl font-black text-white">6+</div>
                          <div className="text-xs text-gray-400">Years Trading</div>
                </div>
                        <div className="bg-gradient-to-br from-orange-950/50 to-transparent p-3 rounded-xl border border-orange-500/20">
                          <div className="text-2xl font-black text-white">2K+</div>
                          <div className="text-xs text-gray-400">Signals Sent</div>
              </div>
            </div>
            
                      <p className="text-gray-300 text-sm leading-relaxed">
                        With over 6 years of professional forex trading experience, I've developed a proven system 
                        that combines technical analysis, market sentiment, and risk management to deliver consistent 
                        results for my community.
                      </p>
                    </div>
                </div>
              </div>
            </div>
            
              {/* Right - Experience Details */}
              <div className="space-y-8">
                <div>
                  <h4 className="text-2xl font-bold text-white mb-4">Trading Journey</h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">1</span>
                </div>
                      <div>
                        <h5 className="text-white font-semibold mb-1">Started Trading (2018)</h5>
                        <p className="text-gray-400 text-sm">Began with small capital, learning the fundamentals of forex markets and technical analysis.</p>
              </div>
            </div>
            
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">2</span>
                      </div>
                      <div>
                        <h5 className="text-white font-semibold mb-1">Professional Development (2020-2022)</h5>
                        <p className="text-gray-400 text-sm">Developed proprietary trading strategies and risk management systems, achieving consistent profitability.</p>
                      </div>
                </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-600 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">3</span>
              </div>
                      <div>
                        <h5 className="text-white font-semibold mb-1">Signal Provider (2022-Present)</h5>
                        <p className="text-gray-400 text-sm">Started sharing signals with a growing community, helping 500+ traders achieve their financial goals.</p>
            </div>
          </div>
        </div>
        </div>
        
                {/* Key Achievements */}
                <div className="bg-gradient-to-br from-red-950/30 to-orange-950/20 p-6 rounded-2xl border border-red-500/20">
                  <h5 className="text-white font-bold mb-4">Key Achievements</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-black text-green-400">78%</div>
                      <div className="text-xs text-gray-400">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-blue-400">15%</div>
                      <div className="text-xs text-gray-400">Monthly Gains</div>
          </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-yellow-400">50+</div>
                      <div className="text-xs text-gray-400">Happy Traders</div>
                  </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-red-400">6+</div>
                      <div className="text-xs text-gray-400">Years Experience</div>
                </div>
                  </div>
                </div>
                  </div>
                </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-gradient-to-b from-black to-red-950/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 bg-red-600/20 text-red-400 border-red-500/30 px-4 py-1.5">Pricing Plans</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 px-4">
              Choose Your Path to Success
            </h2>
            <p className="text-lg md:text-xl text-gray-400 px-4 max-w-2xl mx-auto">Start with proven signals and scale your trading journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 max-w-6xl mx-auto px-4 md:px-0">
            {/* Starter */}
            <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-red-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10 w-full max-w-md mx-auto md:max-w-none">
              <CardHeader>
                <CardTitle className="text-2xl text-white mb-2">Starter</CardTitle>
                <div className="mb-4">
                  <span className="text-5xl font-black text-white">$49</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <CardDescription className="text-gray-400">Perfect for beginners</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {['5-15 signals/week', 'Email or telegram support', 'Stop loss & take profit', 'Weekly market forecast'].map((feature, i) => (
                    <li key={i} className="flex items-start text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                  </li>
                  ))}
                </ul>
                <Button asChild className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white">
                  <Link href="/sign-up?plan=starter">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Professional - Featured */}
            <Card className="bg-gradient-to-br from-red-950/50 to-orange-950/30 border-red-500/50 relative shadow-2xl shadow-red-500/20 hover:scale-105 hover:shadow-3xl hover:shadow-red-500/30 w-full max-w-md mx-auto md:max-w-none md:scale-105 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-1.5 text-sm font-bold">
                  MOST POPULAR
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-white mb-2">Professional</CardTitle>
                <div className="mb-4">
                  <span className="text-5xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">$99</span>
                  <span className="text-gray-400">/month</span>
              </div>
                <CardDescription className="text-gray-300">For serious traders</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {['30+ signals', 'Live scalping 3-4 hours discord', 'Advanced analytics', 'All starter features'].map((feature, i) => (
                    <li key={i} className="flex items-start text-gray-200">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                  </li>
                  ))}
                </ul>
                <Button asChild className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-xl">
                  <Link href="/sign-up?plan=pro">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Elite */}
            <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-yellow-500/30 hover:border-yellow-500/50 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/10 w-full max-w-md mx-auto md:max-w-none">
              <CardHeader>
                <CardTitle className="text-2xl text-white mb-2">Elite</CardTitle>
                <div className="mb-4">
                  <span className="text-5xl font-black bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">$199</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <CardDescription className="text-gray-400">VIP experience</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {['All signals (unlimited)', 'Private Discord channel', '1-on-1 monthly call', 'Portfolio review'].map((feature, i) => (
                    <li key={i} className="flex items-start text-gray-300">
                      <CheckCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                  </li>
                  ))}
                </ul>
                <Button asChild className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-black font-bold">
                  <Link href="/sign-up?plan=elite">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 via-orange-950/30 to-yellow-950/30" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Ready to Transform Your Trading?
            </h2>
            <p className="text-xl text-gray-300 mb-10">
              Join hundreds of successful traders and start receiving professional signals today
            </p>
            <Button asChild size="lg" className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-lg px-12 py-6 shadow-2xl shadow-red-500/30">
              <Link href="/sign-up">Start Your Journey</Link>
          </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-t from-black via-gray-900/50 to-black border-t border-red-500/20 py-16 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-600/5 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          {/* Social Media Links */}
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-red-100 to-yellow-200 bg-clip-text text-transparent mb-8 tracking-wide">
              Connect With Us
            </h3>
            <div className="flex justify-center space-x-6 mb-8">
              {[
                { 
                  name: 'Discord', 
                  icon: Bot, 
                  url: 'https://discord.gg/AKQZmsVmqx', 
                  color: 'from-indigo-500 to-purple-600',
                  hoverColor: 'hover:from-indigo-400 hover:to-purple-500'
                },
                { 
                  name: 'Telegram', 
                  icon: Send, 
                  url: 'https://t.me/redemptionforex', 
                  color: 'from-blue-400 to-blue-600',
                  hoverColor: 'hover:from-blue-300 hover:to-blue-500'
                },
                { 
                  name: 'Instagram', 
                  icon: Instagram, 
                  url: 'https://www.instagram.com/redemptionfx_official?igsh=ZW5jeGExZ3ZkMzN1', 
                  color: 'from-pink-500 to-red-500',
                  hoverColor: 'hover:from-pink-400 hover:to-red-400'
                },
                { 
                  name: 'YouTube', 
                  icon: Youtube, 
                  url: 'https://youtube.com/@redemptionfx', 
                  color: 'from-red-500 to-red-700',
                  hoverColor: 'hover:from-red-400 hover:to-red-600'
                },
                { 
                  name: 'TikTok', 
                  icon: Music2, 
                  url: 'https://www.tiktok.com/@redemptionforex', 
                  color: 'from-black to-gray-800',
                  hoverColor: 'hover:from-gray-800 hover:to-gray-700'
                }
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative group w-16 h-16 bg-gradient-to-br ${social.color} ${social.hoverColor} rounded-2xl flex items-center justify-center transform hover:scale-110 hover:rotate-6 transition-all duration-300 shadow-2xl hover:shadow-3xl`}
                >
                  <social.icon className="w-8 h-8 text-white" />
                  <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  <div className={`absolute -inset-1 bg-gradient-to-br ${social.color} rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity blur-lg`} />
                </a>
              ))}
            </div>
          </div>

          {/* Footer Content */}
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="relative group">
                <div className="text-xl font-black bg-gradient-to-r from-white via-red-100 to-yellow-200 bg-clip-text text-transparent tracking-wider">
                  REDEMPTION<span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">FX</span>
                </div>
                <div className="absolute inset-0 text-xl font-black bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-red-500/20 bg-clip-text text-transparent tracking-wider blur-sm group-hover:blur-none transition-all duration-300">
                  REDEMPTION<span className="text-yellow-400/50">FX</span>
                </div>
              </div>
            </div>
            <div className="text-gray-400 text-center md:text-right">
              <p className="text-sm font-medium">&copy; 2024 RedemptionFX. All rights reserved.</p>
              <p className="text-xs mt-2 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 bg-clip-text text-transparent font-medium tracking-wide">
                Rise from ashes to gold
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

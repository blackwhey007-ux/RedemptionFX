'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, TrendingUp, Shield, Users, Zap, Star, Flame, Crown } from 'lucide-react'
import Link from 'next/link'

interface BrandSettings {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  brandName: string
  tagline: string
  logoUrl: string
  heroTitle: string
  heroSubtitle: string
  stats: {
    winRate: string
    totalPips: string
    activeTraders: string
    yearsExperience: string
  }
  features: Array<{
    title: string
    description: string
    icon: string
  }>
  pricing: {
    starter: { name: string; price: number; features: string[] }
    pro: { name: string; price: number; features: string[] }
    elite: { name: string; price: number; features: string[] }
  }
}

export default function DynamicHomePage() {
  const [settings, setSettings] = useState<BrandSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('redemptionfx-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    } else {
      // Default settings
      setSettings({
        primaryColor: '#ef4444',
        accentColor: '#ffd700',
        backgroundColor: '#000000',
        surfaceColor: '#111111',
        textColor: '#ffffff',
        brandName: 'RedemptionFX',
        tagline: 'Rise from ashes to gold',
        logoUrl: '',
        heroTitle: 'RedemptionFX',
        heroSubtitle: 'Rise from ashes to gold with professional forex trading signals',
        stats: {
          winRate: '78%',
          totalPips: '2,847',
          activeTraders: '500+',
          yearsExperience: '6'
        },
        features: [
          {
            title: 'Verified Performance',
            description: 'Real-time tracking with transparent win rates and profit factors. Every trade is verified and documented.',
            icon: 'TrendingUp'
          },
          {
            title: 'Instant Alerts',
            description: 'Get signals instantly via Telegram, Discord, and email. Never miss a profitable opportunity.',
            icon: 'Zap'
          },
          {
            title: 'Risk Management',
            description: 'Every signal includes stop loss and take profit levels. Protect your capital while maximizing gains.',
            icon: 'Shield'
          }
        ],
        pricing: {
          starter: {
            name: 'Starter',
            price: 49,
            features: ['Swing signals only', '5-10 signals per week', 'Email support', 'Risk management included']
          },
          pro: {
            name: 'Professional',
            price: 99,
            features: ['Swing + Scalping signals', '20+ signals per week', 'Priority support', 'Telegram access', 'Advanced risk management', 'Performance tracking']
          },
          elite: {
            name: 'Elite',
            price: 199,
            features: ['All signals', 'Unlimited signals', 'Private Discord', '1-on-1 monthly call', 'Advanced analytics', 'Priority signal access', 'Custom strategies']
          }
        }
      })
    }
    setLoading(false)
  }, [])

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp': return <TrendingUp className="w-6 h-6 text-white" />
      case 'Zap': return <Zap className="w-6 h-6 text-black" />
      case 'Shield': return <Shield className="w-6 h-6 text-white" />
      default: return <TrendingUp className="w-6 h-6 text-white" />
    }
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: `linear-gradient(135deg, ${settings.backgroundColor} 0%, ${settings.surfaceColor} 100%)`,
        color: settings.textColor
      }}
    >
      {/* Hero Section with 3D Fire Effects */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Animated Fire Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-orange-900/20 to-yellow-900/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/20 via-transparent to-transparent" />
          
          {/* Animated Fire Particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-red-500 rounded-full animate-pulse opacity-60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
          
          {/* Floating Fire Orbs */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-gradient-to-r from-yellow-500/20 to-red-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative container mx-auto px-4 py-20 z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* 3D Phoenix Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Outer Glow */}
                <div 
                  className="absolute inset-0 w-32 h-32 rounded-full blur-2xl opacity-60 animate-pulse"
                  style={{ backgroundColor: settings.primaryColor }}
                />
                {/* Main Logo */}
                <div 
                  className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`
                  }}
                >
                  <div className="relative">
                    {/* Phoenix Icon with Fire Effect */}
                    <Flame className="w-16 h-16 text-white drop-shadow-lg" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping opacity-75" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-orange-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }} />
                  </div>
                </div>
                {/* Fire Particles around logo */}
                <div className="absolute -top-4 -left-4 w-3 h-3 bg-red-400 rounded-full animate-bounce" />
                <div className="absolute -top-2 -right-6 w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                <div className="absolute -bottom-4 -right-2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
                <div className="absolute -bottom-2 -left-6 w-3 h-3 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.9s' }} />
              </div>
            </div>

            {/* Main Title with 3D Effect */}
            <h1 className="text-6xl md:text-8xl font-black mb-6 relative">
              <span 
                className="bg-gradient-to-r from-white via-red-100 to-yellow-200 bg-clip-text text-transparent drop-shadow-2xl"
                style={{ color: settings.textColor }}
              >
                {settings.heroTitle}
              </span>
              {/* 3D Shadow Effect */}
              <div 
                className="absolute inset-0 text-6xl md:text-8xl font-black -z-10 transform translate-x-2 translate-y-2"
                style={{ color: `${settings.primaryColor}30` }}
              >
                {settings.heroTitle}
              </div>
            </h1>

            {/* Subtitle with Glow */}
            <p className="text-2xl md:text-3xl mb-8 font-light tracking-wide">
              <span 
                className="bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent font-semibold"
                style={{ 
                  background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.accentColor})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {settings.tagline}
              </span>
              <br />
              <span className="text-xl" style={{ color: settings.textColor + 'CC' }}>
                with professional forex trading signals
              </span>
            </p>

            {/* Stats with Fire Accents */}
            <div className="flex justify-center items-center space-x-8 mb-12 text-sm" style={{ color: settings.textColor + '99' }}>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                <span>{settings.stats.winRate} Win Rate</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
                <span>{settings.stats.totalPips}+ Pips</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse" />
                <span>{settings.stats.activeTraders} Traders</span>
              </div>
            </div>

            {/* CTA Buttons with Fire Effects */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button asChild size="lg" className="text-white hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-2xl relative overflow-hidden group">
                <Link 
                  href="/sign-up" 
                  className="flex items-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`
                  }}
                >
                  <Flame className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                  Start Trading Today
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="transform hover:scale-105 transition-all duration-300 shadow-xl relative overflow-hidden group">
                <Link 
                  href="/pricing" 
                  className="flex items-center"
                  style={{ 
                    borderColor: settings.accentColor,
                    color: settings.accentColor
                  }}
                >
                  <Crown className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                  View Pricing
                </Link>
              </Button>
            </div>

            {/* Floating Elements */}
            <div className="absolute top-20 left-10 w-4 h-4 bg-red-400 rounded-full animate-ping opacity-60" />
            <div className="absolute top-40 right-20 w-3 h-3 bg-yellow-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-20 left-20 w-2 h-2 bg-orange-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '2s' }} />
          </div>
        </div>
      </section>

      {/* Stats Section with 3D Effects */}
      <section 
        className="py-20 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(to bottom, ${settings.backgroundColor}80, ${settings.surfaceColor}CC)`
        }}
      >
        {/* Background Fire Effects */}
        <div className="absolute inset-0">
          <div 
            className="absolute top-0 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse"
            style={{ background: `linear-gradient(to right, ${settings.primaryColor}10, ${settings.primaryColor}05)` }}
          />
          <div 
            className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full blur-3xl animate-pulse"
            style={{ 
              background: `linear-gradient(to right, ${settings.accentColor}10, ${settings.primaryColor}05)`,
              animationDelay: '1s'
            }}
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span 
                className="bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent"
                style={{ 
                  background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.accentColor})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Proven Results
              </span>
            </h2>
            <p className="text-lg" style={{ color: settings.textColor + '99' }}>Trusted by traders worldwide</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="relative mb-4">
                <div 
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`
                  }}
                >
                  <div className="text-2xl font-black text-white">{settings.stats.winRate}</div>
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-ping" />
              </div>
              <div className="font-semibold" style={{ color: settings.textColor + 'CC' }}>Win Rate</div>
              <div className="text-sm" style={{ color: settings.textColor + '66' }}>Verified Performance</div>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-4">
                <div 
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.accentColor}dd 100%)`
                  }}
                >
                  <div className="text-lg font-black text-black">{settings.stats.totalPips}</div>
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
              </div>
              <div className="font-semibold" style={{ color: settings.textColor + 'CC' }}>Total Pips</div>
              <div className="text-sm" style={{ color: settings.textColor + '66' }}>Cumulative Gains</div>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-4">
                <div 
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300"
                  style={{ 
                    background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.primaryColor}CC)`
                  }}
                >
                  <div className="text-lg font-black text-white">{settings.stats.activeTraders}</div>
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
              </div>
              <div className="font-semibold" style={{ color: settings.textColor + 'CC' }}>Active Traders</div>
              <div className="text-sm" style={{ color: settings.textColor + '66' }}>Growing Community</div>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-4">
                <div 
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300"
                  style={{ 
                    background: `linear-gradient(to right, ${settings.accentColor}, ${settings.primaryColor})`
                  }}
                >
                  <div className="text-lg font-black text-white">{settings.stats.yearsExperience}</div>
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
              </div>
              <div className="font-semibold" style={{ color: settings.textColor + 'CC' }}>Years Experience</div>
              <div className="text-sm" style={{ color: settings.textColor + '66' }}>Market Expertise</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with 3D Fire Effects */}
      <section className="py-24 relative overflow-hidden">
        {/* Background Fire Orbs */}
        <div className="absolute inset-0">
          <div 
            className="absolute top-1/4 left-0 w-96 h-96 rounded-full blur-3xl animate-pulse"
            style={{ background: `linear-gradient(to right, ${settings.primaryColor}05, ${settings.primaryColor}02)` }}
          />
          <div 
            className="absolute bottom-1/4 right-0 w-80 h-80 rounded-full blur-3xl animate-pulse"
            style={{ 
              background: `linear-gradient(to right, ${settings.accentColor}05, ${settings.primaryColor}02)`,
              animationDelay: '2s'
            }}
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">
              <span 
                className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent"
                style={{ 
                  background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.accentColor}, ${settings.accentColor})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Why Choose {settings.brandName}?
              </span>
            </h2>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: settings.textColor + 'CC' }}>
              Professional-grade signals with institutional-level analysis and 
              <span className="font-semibold" style={{ color: settings.accentColor }}> proven fire-powered results</span>
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10">
            {settings.features.map((feature, index) => (
              <Card 
                key={index}
                className="glass group hover:shadow-2xl transition-all duration-500 transform hover:scale-105 relative overflow-hidden"
                style={{ 
                  borderColor: `${settings.primaryColor}30`,
                  background: `rgba(255, 255, 255, 0.05)`
                }}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primaryColor}05, transparent)`
                  }}
                />
                <CardHeader className="relative z-10">
                  <div className="relative mb-6">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300"
                      style={{ 
                        background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`
                      }}
                    >
                      {getIcon(feature.icon)}
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full animate-ping opacity-75" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-red-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }} />
                  </div>
                  <CardTitle 
                    className="text-2xl mb-3 group-hover:text-red-300 transition-colors"
                    style={{ color: settings.textColor }}
                  >
                    {feature.title}
                  </CardTitle>
                  <CardDescription 
                    className="text-lg leading-relaxed"
                    style={{ color: settings.textColor + 'CC' }}
                  >
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section 
        className="py-20"
        style={{ 
          background: `linear-gradient(to bottom, ${settings.backgroundColor}30, ${settings.surfaceColor}50)`
        }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: settings.textColor }}>
              Choose Your Plan
            </h2>
            <p className="text-xl" style={{ color: settings.textColor + '99' }}>
              Start with our proven signals and scale your trading
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <Card 
              className="glass relative"
              style={{ 
                borderColor: `${settings.textColor}30`,
                background: `rgba(255, 255, 255, 0.05)`
              }}
            >
              <CardHeader className="text-center">
                <CardTitle style={{ color: settings.textColor }}>{settings.pricing.starter.name}</CardTitle>
                <CardDescription style={{ color: settings.textColor + '99' }}>Perfect for beginners</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold" style={{ color: settings.textColor }}>
                    ${settings.pricing.starter.price}
                  </span>
                  <span className="text-lg" style={{ color: settings.textColor + '66' }}>/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {settings.pricing.starter.features.map((feature, index) => (
                    <li key={index} className="flex items-center" style={{ color: settings.textColor + 'CC' }}>
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  asChild 
                  className="w-full"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`,
                    color: 'white'
                  }}
                >
                  <Link href="/sign-up?plan=starter">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Professional Plan - Most Popular */}
            <Card 
              className="glass relative"
              style={{ 
                borderColor: settings.primaryColor,
                background: `rgba(255, 255, 255, 0.05)`
              }}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge 
                  className="px-4 py-1 text-white"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`
                  }}
                >
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle style={{ color: settings.textColor }}>{settings.pricing.pro.name}</CardTitle>
                <CardDescription style={{ color: settings.textColor + '99' }}>For serious traders</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold" style={{ color: settings.textColor }}>
                    ${settings.pricing.pro.price}
                  </span>
                  <span className="text-lg" style={{ color: settings.textColor + '66' }}>/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {settings.pricing.pro.features.map((feature, index) => (
                    <li key={index} className="flex items-center" style={{ color: settings.textColor + 'CC' }}>
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  asChild 
                  className="w-full"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`,
                    color: 'white'
                  }}
                >
                  <Link href="/sign-up?plan=pro">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Elite Plan */}
            <Card 
              className="glass relative"
              style={{ 
                borderColor: settings.accentColor,
                background: `rgba(255, 255, 255, 0.05)`
              }}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge 
                  className="px-4 py-1 text-black"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.accentColor}dd 100%)`
                  }}
                >
                  VIP
                </Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle style={{ color: settings.textColor }}>{settings.pricing.elite.name}</CardTitle>
                <CardDescription style={{ color: settings.textColor + '99' }}>VIP experience</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold" style={{ color: settings.textColor }}>
                    ${settings.pricing.elite.price}
                  </span>
                  <span className="text-lg" style={{ color: settings.textColor + '66' }}>/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {settings.pricing.elite.features.map((feature, index) => (
                    <li key={index} className="flex items-center" style={{ color: settings.textColor + 'CC' }}>
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  asChild 
                  className="w-full"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.accentColor}dd 100%)`,
                    color: 'black'
                  }}
                >
                  <Link href="/sign-up?plan=elite">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-20"
        style={{ 
          background: `linear-gradient(to right, ${settings.primaryColor}20, ${settings.accentColor}20)`
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4" style={{ color: settings.textColor }}>
            Ready to Transform Your Trading?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: settings.textColor + '99' }}>
            Join hundreds of successful traders who trust {settings.brandName} for their trading signals
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild 
              size="lg"
              style={{ 
                background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`,
                color: 'white'
              }}
            >
              <Link href="/sign-up">Start Your Journey Today</Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg"
              style={{ 
                borderColor: settings.accentColor,
                color: settings.accentColor
              }}
            >
              <Link href="/pricing">View Pricing Plans</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-12"
        style={{ backgroundColor: settings.backgroundColor }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center" style={{ color: settings.textColor + '66' }}>
            <p>&copy; 2024 {settings.brandName}. All rights reserved.</p>
            <p className="mt-2">{settings.tagline}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

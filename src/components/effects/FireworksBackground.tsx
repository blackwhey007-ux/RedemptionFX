'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface FireParticle {
  id: number
  startX: number
  startY: number
  duration: number
  delay: number
  peakY: number
  size: number
}

export function FireworksBackground() {
  const [particles, setParticles] = useState<FireParticle[]>([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detect mobile devices for performance optimization
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Generate particle configuration
    const particleCount = isMobile ? 12 : 20
    const newParticles: FireParticle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      startX: Math.random() * 100, // Random horizontal position (0-100%)
      startY: 100, // Start from bottom
      duration: 2.5 + Math.random() * 1.5, // 2.5-4s
      delay: Math.random() * 3, // Stagger up to 3s
      peakY: -20 - Math.random() * 30, // Peak at -20 to -50vh
      size: 4 + Math.random() * 4, // Size between 4-8px
    }))
    setParticles(newParticles)
  }, [isMobile])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.startX}%`,
            bottom: '0px',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            // Gradient from red to orange to yellow
            background: `radial-gradient(circle, 
              rgb(239, 68, 68) 0%, 
              rgb(249, 115, 22) 40%, 
              rgb(251, 191, 36) 100%
            )`,
            boxShadow: `
              0 0 ${particle.size * 2}px rgb(239, 68, 68),
              0 0 ${particle.size * 3}px rgb(249, 115, 22),
              0 0 ${particle.size * 4}px rgb(251, 191, 36),
              0 0 ${particle.size * 6}px rgba(251, 191, 36, 0.5)
            `,
            // GPU acceleration optimizations
            willChange: 'transform, opacity',
            transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
            backfaceVisibility: 'hidden',
            WebkitTransform: 'translate3d(0, 0, 0)',
          }}
          initial={{
            y: 0,
            scale: 1,
            opacity: 0,
          }}
          animate={{
            y: [`0vh`, `${particle.peakY}vh`, `${particle.peakY - 10}vh`], // Shoot up, then burst higher
            scale: [0.5, 1.5, 0.8, 1.3, 0], // Pulse and expand during burst
            opacity: [0, 1, 1, 0.7, 0],
            x: [
              '0px',
              `${(Math.random() - 0.5) * 30}px`, // Burst spread
              `${(Math.random() - 0.5) * 60}px`,
            ],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: [0.16, 1, 0.3, 1], // Ease out cubic
            times: [0, 0.5, 0.65, 0.85, 1], // Keyframe timing
          }}
        />
      ))}
      
      {/* Additional burst trails for extra fireworks effect */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <motion.div
            key={`trail-${particle.id}`}
            className="absolute rounded-full"
            style={{
              left: `${particle.startX}%`,
              bottom: '0px',
              width: `${particle.size * 0.5}px`,
              height: `${particle.size * 2}px`,
              background: 'linear-gradient(to top, transparent, rgb(239, 68, 68), rgb(251, 191, 36))',
              opacity: 0.6,
              transformOrigin: 'bottom center',
              // GPU acceleration optimizations
              willChange: 'transform, opacity',
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
              WebkitTransform: 'translate3d(0, 0, 0)',
            }}
            initial={{
              y: 0,
              scaleY: 0,
              opacity: 0,
            }}
            animate={{
              y: [`0vh`, `${particle.peakY * 0.7}vh`, `${particle.peakY * 1.2}vh`],
              scaleY: [0, 1, 0],
              opacity: [0, 0.8, 0],
              rotate: [(Math.random() - 0.5) * 45],
            }}
            transition={{
              duration: particle.duration * 0.6,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'easeOut',
              times: [0, 0.4, 1],
            }}
          />
        ))}
      </div>
    </div>
  )
}

import React from 'react'

interface RedemptionLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function RedemptionLogo({ className = '', size = 'md' }: RedemptionLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* RedemptionFX Logo Design */}
      <defs>
        <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#F87171" />
        </linearGradient>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      
      {/* Background Circle */}
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="url(#redGradient)"
        stroke="url(#goldGradient)"
        strokeWidth="2"
      />
      
      {/* R Letter */}
      <path
        d="M25 20 L25 80 L35 80 L35 50 L45 50 L55 30 L45 30 L40 45 L35 45 L35 20 Z"
        fill="white"
        className="dark:fill-black"
      />
      
      {/* FX Text */}
      <text
        x="50"
        y="70"
        fontSize="16"
        fontWeight="bold"
        textAnchor="middle"
        fill="url(#goldGradient)"
        className="font-bold"
      >
        FX
      </text>
      
      {/* Decorative Elements */}
      <circle cx="70" cy="30" r="3" fill="url(#goldGradient)" />
      <circle cx="75" cy="35" r="2" fill="url(#goldGradient)" />
      <circle cx="30" cy="75" r="2" fill="url(#goldGradient)" />
    </svg>
  )
}

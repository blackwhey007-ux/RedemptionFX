// Page discovery utility for dynamic promotion page options
import { readdir } from 'fs/promises'
import { join } from 'path'

export interface PageInfo {
  path: string
  name: string
  description: string
  category: 'dashboard' | 'admin' | 'public' | 'test'
}

// Static list of known pages with their metadata
const KNOWN_PAGES: PageInfo[] = [
  // Dashboard pages
  { path: '/dashboard', name: 'Dashboard', description: 'Main dashboard overview', category: 'dashboard' },
  { path: '/dashboard/trading-journal', name: 'Trading Journal', description: 'View and manage trading entries', category: 'dashboard' },
  { path: '/dashboard/profiles', name: 'Profiles', description: 'View member profiles', category: 'dashboard' },
  { path: '/dashboard/profile', name: 'Profile Settings', description: 'Edit your profile settings', category: 'dashboard' },
  { path: '/dashboard/currency-database', name: 'Currency Database', description: 'Currency information and data', category: 'dashboard' },
  { path: '/dashboard/members', name: 'Members', description: 'View all members', category: 'dashboard' },
  
  // Admin pages
  { path: '/dashboard/admin/promotions', name: 'Admin Promotions', description: 'Manage promotions', category: 'admin' },
  { path: '/dashboard/admin/members', name: 'Admin Members', description: 'Manage members', category: 'admin' },
  
  // Public pages
  { path: '/pricing', name: 'Pricing', description: 'View pricing plans', category: 'public' },
  { path: '/sign-in', name: 'Sign In', description: 'User sign in page', category: 'public' },
  { path: '/sign-up', name: 'Sign Up', description: 'User registration page', category: 'public' },
  
  // Test pages (excluded from production)
  { path: '/test-notifications', name: 'Test Notifications', description: 'Test notification system', category: 'test' },
  { path: '/test-promotion-links', name: 'Test Promotion Links', description: 'Test promotion link functionality', category: 'test' },
  { path: '/test-internal-links', name: 'Test Internal Links', description: 'Test internal link navigation', category: 'test' },
]

// Function to get all available pages
export function getAllPages(): PageInfo[] {
  return KNOWN_PAGES
}

// Function to get pages by category
export function getPagesByCategory(category: PageInfo['category']): PageInfo[] {
  return KNOWN_PAGES.filter(page => page.category === category)
}

// Function to get pages for promotion display (excludes test pages in production)
export function getPromotionPages(includeTest: boolean = false): PageInfo[] {
  return KNOWN_PAGES.filter(page => includeTest || page.category !== 'test')
}

// Function to get pages for notification redirects (all pages except test)
export function getNotificationPages(): PageInfo[] {
  return KNOWN_PAGES.filter(page => page.category !== 'test')
}

// Function to validate if a path exists
export function isValidPagePath(path: string): boolean {
  return KNOWN_PAGES.some(page => page.path === path)
}

// Function to get page info by path
export function getPageInfo(path: string): PageInfo | undefined {
  return KNOWN_PAGES.find(page => page.path === path)
}

// Function to add a new page (for future dynamic discovery)
export function addPage(pageInfo: PageInfo): void {
  if (!KNOWN_PAGES.find(page => page.path === pageInfo.path)) {
    KNOWN_PAGES.push(pageInfo)
  }
}

// Function to remove a page
export function removePage(path: string): void {
  const index = KNOWN_PAGES.findIndex(page => page.path === path)
  if (index > -1) {
    KNOWN_PAGES.splice(index, 1)
  }
}

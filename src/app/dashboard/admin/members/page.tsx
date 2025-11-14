'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Filter, 
  Download, 
  UserPlus, 
  Crown, 
  User, 
  Shield, 
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Mail,
  MessageSquare,
  AlertTriangle,
  Users,
  TrendingUp,
  Activity
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  getAllMembers, 
  updateMemberRole, 
  updateMemberStatus, 
  updateMemberPayment,
  deleteMember, 
  getMemberStats,
  getRecentMembers,
  Member 
} from '@/lib/memberService'
import { NotificationService } from '@/lib/notificationService'

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [recentMembers, setRecentMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    plan: '',
    amount: 0,
    currency: 'USD',
    paidAt: new Date(),
    expiresAt: new Date()
  })
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('month')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    admin: 0,
    vip: 0,
    guest: 0,
    new: 0,
    active: 0,
    inactive: 0,
    pending: 0
  })

  // Load members and stats
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [membersData, recentMembersData, statsData] = await Promise.all([
          getAllMembers(),
          getRecentMembers(7),
          getMemberStats()
        ])
        
        setMembers(membersData)
        setRecentMembers(recentMembersData)
        setStats(statsData)
      } catch (error) {
        console.error('Error loading members:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter members
  useEffect(() => {
    let filtered = members

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    setFilteredMembers(filtered)
  }, [members, searchTerm, roleFilter, statusFilter])

  // Handle role change
  const handleRoleChange = async (uid: string, newRole: 'admin' | 'vip' | 'guest') => {
    setActionLoading(uid)
    try {
      console.log('Approving member:', uid, 'as', newRole)
      
      // Mark this member as approved FIRST to immediately update notifications
      console.log('Marking member as approved:', uid)
      // markMemberAsApproved function removed - role update handles approval
      
      await updateMemberRole(uid, newRole)
      
      // Send notification to the user based on their new role
      const member = members.find(m => m.uid === uid)
      if (member) {
        if (newRole === 'vip') {
          await NotificationService.createNotification({
            userId: uid,
            type: 'vip_approved',
            title: 'VIP Access Approved!',
            message: `Congratulations ${member.displayName || member.email || 'User'}! Your VIP membership has been approved. You now have access to live signals and exclusive features.`,
            data: {
              soundType: 'vip_approved',
              actionUrl: '/dashboard/signals'
            }
          })
        } else if (newRole === 'guest') {
          await NotificationService.createNotification({
            userId: uid,
            type: 'system',
            title: 'Account Status Updated',
            message: 'Your account status has been updated. You now have guest access to our platform.',
            data: {
              soundType: 'default'
            }
          })
        }
      }
      
      // Refresh data
      const [membersData, statsData] = await Promise.all([
        getAllMembers(),
        getMemberStats()
      ])
      setMembers(membersData)
      setStats(statsData)
      
      console.log('Member approved successfully:', uid)
    } catch (error) {
      console.error('Error updating role:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle status change
  const handleStatusChange = async (uid: string, newStatus: 'active' | 'inactive' | 'pending') => {
    setActionLoading(uid)
    try {
      // Mark this member as approved FIRST when activating (changing from pending to active)
      if (newStatus === 'active') {
        // markMemberAsApproved function removed - status update handles approval
      }
      
      await updateMemberStatus(uid, newStatus)
      
      // Refresh data
      const [membersData, statsData] = await Promise.all([
        getAllMembers(),
        getMemberStats()
      ])
      setMembers(membersData)
      setStats(statsData)
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle member deletion
  const handleDeleteMember = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      return
    }

    setActionLoading(uid)
    try {
      await deleteMember(uid)
      // Refresh data
      const [membersData, statsData] = await Promise.all([
        getAllMembers(),
        getMemberStats()
      ])
      setMembers(membersData)
      setStats(statsData)
    } catch (error) {
      console.error('Error deleting member:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Open payment modal
  const handleOpenPaymentModal = (member: Member) => {
    setSelectedMember(member)
    
    // Helper function to safely convert dates
    const safeDate = (dateValue: any): Date => {
      if (!dateValue) return new Date()
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate()
      }
      if (dateValue instanceof Date) {
        return dateValue
      }
      if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue)
        return isNaN(parsed.getTime()) ? new Date() : parsed
      }
      return new Date()
    }
    
    setPaymentForm({
      plan: member.paymentInfo?.plan || '',
      amount: member.paymentInfo?.amount || 0,
      currency: member.paymentInfo?.currency || 'USD',
      paidAt: safeDate(member.paymentInfo?.paidAt),
      expiresAt: safeDate(member.paymentInfo?.expiresAt)
    })
    setPaymentModalOpen(true)
  }

  // Handle payment update
  const handleUpdatePayment = async () => {
    if (!selectedMember) return

    setActionLoading(selectedMember.uid)
    try {
      await updateMemberPayment(selectedMember.uid, paymentForm)
      
      // Refresh data
      const [membersData, statsData] = await Promise.all([
        getAllMembers(),
        getMemberStats()
      ])
      setMembers(membersData)
      setStats(statsData)
      
      // Close modal
      setPaymentModalOpen(false)
      setSelectedMember(null)
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Failed to update payment information')
    } finally {
      setActionLoading(null)
    }
  }

  // Calculate revenue based on filter
  const calculateRevenue = () => {
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = new Date()

    switch (revenueFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'custom':
        startDate = customStartDate
        endDate = customEndDate
        break
      case 'all':
        startDate = null
        endDate = null
        break
    }

    return members.reduce((sum, m) => {
      const paidAt = m.paymentInfo?.paidAt?.toDate?.()
      if (!paidAt) return sum
      
      if (startDate && paidAt < startDate) return sum
      if (endDate && paidAt > endDate) return sum
      
      return sum + (m.paymentInfo?.amount || 0)
    }, 0)
  }

  // Export to CSV
  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Status', 'Join Date', 'Last Login', 'Payment Amount', 'Payment Currency', 'Discord', 'Telegram'],
      ...filteredMembers.map(member => [
        member.displayName,
        member.email,
        member.role,
        member.status,
        member.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A',
        member.lastLogin?.toDate?.()?.toLocaleDateString() || 'N/A',
        member.paymentInfo?.amount || 0,
        member.paymentInfo?.currency || 'N/A',
        member.profileSettings?.discordUsername || 'N/A',
        member.profileSettings?.telegramUsername || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-900 dark:text-white">Loading members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Member Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-red-500" />
                Member Management
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                Manage your VIP clients and track payments
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" className="border-red-200 dark:border-red-800/50 text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={clearApprovedMembers} variant="outline" className="border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Clear Approved (Debug)
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Revenue Date Filter */}
      <Card className="glass-card border-red-500/40 dark:border-red-500/60 shadow-xl shadow-red-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Revenue Tracking</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  ${calculateRevenue().toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={revenueFilter === 'today' ? 'default' : 'outline'}
                onClick={() => setRevenueFilter('today')}
                className={revenueFilter === 'today' ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white' : 'border-red-500/30 dark:border-red-500/50'}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant={revenueFilter === 'week' ? 'default' : 'outline'}
                onClick={() => setRevenueFilter('week')}
                className={revenueFilter === 'week' ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white' : 'border-red-500/30 dark:border-red-500/50'}
              >
                Week
              </Button>
              <Button
                size="sm"
                variant={revenueFilter === 'month' ? 'default' : 'outline'}
                onClick={() => setRevenueFilter('month')}
                className={revenueFilter === 'month' ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white' : 'border-red-500/30 dark:border-red-500/50'}
              >
                Month
              </Button>
              <Button
                size="sm"
                variant={revenueFilter === 'year' ? 'default' : 'outline'}
                onClick={() => setRevenueFilter('year')}
                className={revenueFilter === 'year' ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white' : 'border-red-500/30 dark:border-red-500/50'}
              >
                Year
              </Button>
              <Button
                size="sm"
                variant={revenueFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setRevenueFilter('all')}
                className={revenueFilter === 'all' ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white' : 'border-red-500/30 dark:border-red-500/50'}
              >
                All Time
              </Button>
              <Button
                size="sm"
                variant={revenueFilter === 'custom' ? 'default' : 'outline'}
                onClick={() => setRevenueFilter('custom')}
                className={revenueFilter === 'custom' ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white' : 'border-red-500/30 dark:border-red-500/50'}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Custom
              </Button>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {revenueFilter === 'custom' && (
            <div className="mt-4 pt-4 border-t border-red-500/30 dark:border-red-500/50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="startDate" className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setCustomStartDate(e.target.value ? new Date(e.target.value) : null)}
                    className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="endDate" className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setCustomEndDate(e.target.value ? new Date(e.target.value) : null)}
                    className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Metrics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Member Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="branded-card">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <Users className="w-5 h-5 text-red-500" />
                    <span className="text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded-full">
                      Total
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="branded-card">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">
                      VIP
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-yellow-500">{stats.vip}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Premium</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="branded-card">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                      New
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-500">{stats.new}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">This Week</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="branded-card">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-emerald-500">{stats.active}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Online</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Revenue & Payment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="branded-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {revenueFilter === 'today' ? 'Today\'s Revenue' : 
                         revenueFilter === 'week' ? 'Weekly Revenue' :
                         revenueFilter === 'month' ? 'Monthly Revenue' :
                         revenueFilter === 'year' ? 'Yearly Revenue' :
                         revenueFilter === 'custom' ? 'Custom Period' :
                         'Total Revenue'}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      ${calculateRevenue().toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {members.filter(m => {
                        const paidAt = m.paymentInfo?.paidAt?.toDate?.()
                        if (!paidAt) return false
                        const now = new Date()
                        let startDate: Date | null = null
                        
                        switch (revenueFilter) {
                          case 'today':
                            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                            break
                          case 'week':
                            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                            break
                          case 'month':
                            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                            break
                          case 'year':
                            startDate = new Date(now.getFullYear(), 0, 1)
                            break
                          case 'custom':
                            startDate = customStartDate
                            break
                          case 'all':
                            return true
                        }
                        
                        return startDate ? paidAt >= startDate : true
                      }).length} payments in this period
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="branded-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Paid Members</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {members.filter(m => m.paymentInfo?.amount && m.paymentInfo.amount > 0).length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {((members.filter(m => m.paymentInfo?.amount && m.paymentInfo.amount > 0).length / Math.max(members.length, 1)) * 100).toFixed(0)}% of total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="branded-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Expiring Soon</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {members.filter(m => {
                        const expiresAt = m.paymentInfo?.expiresAt?.toDate?.()
                        if (!expiresAt) return false
                        const daysUntilExpiry = Math.floor((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        return daysUntilExpiry > 0 && daysUntilExpiry <= 7
                      }).length}
                    </p>
                    <p className="text-xs text-orange-500 mt-1">
                      Within 7 days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Quick Stats Summary */}
        <div className="space-y-4">
          <Card className="branded-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
                  <Users className="w-4 h-4 text-white" />
                </div>
                Member Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.admin}</span>
                    <div className="w-16 h-2 bg-slate-200 dark:bg-red-900/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500" 
                        style={{ width: `${(stats.admin / Math.max(stats.total, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">VIP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.vip}</span>
                    <div className="w-16 h-2 bg-slate-200 dark:bg-red-900/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600" 
                        style={{ width: `${(stats.vip / Math.max(stats.total, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Guest</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.guest}</span>
                    <div className="w-16 h-2 bg-slate-200 dark:bg-red-900/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-400 to-red-600" 
                        style={{ width: `${(stats.guest / Math.max(stats.total, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-red-500/30 dark:border-red-500/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Active Status</span>
                    <span className="font-semibold text-green-500">{stats.active}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Inactive</span>
                    <span className="font-semibold text-slate-500">{stats.inactive}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Pending</span>
                    <span className="font-semibold text-yellow-500">{stats.pending}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-red-500/30 dark:border-red-500/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Revenue</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    ${members.reduce((sum, m) => sum + (m.paymentInfo?.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {recentMembers.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Pending Approvals ({recentMembers.length})
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              New members who joined in the last 7 days - review and assign roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMembers.map((member) => (
                <div key={member.uid} className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/50 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {member.displayName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{member.displayName}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Joined {member.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleRoleChange(member.uid, 'vip')}
                      disabled={actionLoading === member.uid}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <Crown className="w-4 h-4 mr-1" />
                      Approve as VIP
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRoleChange(member.uid, 'guest')}
                      disabled={actionLoading === member.uid}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                    >
                      <User className="w-4 h-4 mr-1" />
                      Keep as Guest
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-black/80 border-red-200 dark:border-red-800/50 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-white/80 dark:bg-black/80 border-red-200 dark:border-red-800/50 text-slate-900 dark:text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-white/80 dark:bg-black/80 border-red-200 dark:border-red-800/50 text-slate-900 dark:text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">All Members ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-500/30 dark:border-red-500/50">
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Member</th>
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Role</th>
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Payment</th>
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Join Date</th>
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.uid} className="border-b border-red-500/30 dark:border-red-500/50 hover:bg-slate-50 dark:hover:bg-red-900/20">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          {member.displayName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white font-medium">{member.displayName}</p>
                          <p className="text-slate-600 dark:text-slate-400 text-sm">{member.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {member.profileSettings?.discordUsername && (
                              <div className="flex items-center text-red-500 text-xs">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {member.profileSettings.discordUsername}
                              </div>
                            )}
                            {member.profileSettings?.telegramUsername && (
                              <div className="flex items-center text-red-500 text-xs">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {member.profileSettings.telegramUsername}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      {member.role === 'admin' ? (
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-red-500" />
                          <span className="text-red-600 dark:text-red-400 font-semibold">Admin</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">(Firebase only)</span>
                        </div>
                      ) : (
                        <Select
                          value={member.role || 'guest'}
                          onValueChange={(newRole) => handleRoleChange(member.uid, newRole as 'vip' | 'guest')}
                          disabled={actionLoading === member.uid}
                        >
                          <SelectTrigger className="w-32 bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    
                    <td className="py-4 px-4">
                      <Select
                        value={member.status || 'active'}
                        onValueChange={(newStatus) => handleStatusChange(member.uid, newStatus as 'active' | 'inactive' | 'pending')}
                        disabled={actionLoading === member.uid}
                      >
                        <SelectTrigger className="w-32 bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {member.paymentInfo?.amount ? (
                            <div>
                              {member.paymentInfo.plan && (
                                <p className="text-slate-900 dark:text-white font-semibold text-sm">
                                  {member.paymentInfo.plan}
                                </p>
                              )}
                              <p className="text-slate-900 dark:text-white font-medium">
                                {member.paymentInfo.amount} {member.paymentInfo.currency}
                              </p>
                              <p className="text-slate-600 dark:text-slate-400 text-xs">
                                Paid: {member.paymentInfo.paidAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                              </p>
                              {member.paymentInfo.expiresAt && (
                                <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                                  Expires: {member.paymentInfo.expiresAt.toDate?.()?.toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">No payment</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenPaymentModal(member)}
                          disabled={actionLoading === member.uid}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="text-slate-900 dark:text-white">
                        {member.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs">
                        Last: {member.lastLogin?.toDate?.()?.toLocaleDateString() || 'Never'}
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteMember(member.uid)}
                          disabled={actionLoading === member.uid}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        {actionLoading === member.uid && (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No members found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-black/90">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Edit Payment Information
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Update payment details for {selectedMember?.displayName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plan" className="text-slate-900 dark:text-white">
                Payment Plan
              </Label>
              <Input
                id="plan"
                placeholder="e.g., Monthly VIP, Yearly Premium"
                value={paymentForm.plan}
                onChange={(e) => setPaymentForm({ ...paymentForm, plan: e.target.value })}
                className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-slate-900 dark:text-white">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency" className="text-slate-900 dark:text-white">
                  Currency
                </Label>
                <Select value={paymentForm.currency} onValueChange={(value) => setPaymentForm({ ...paymentForm, currency: value })}>
                  <SelectTrigger className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paidAt" className="text-slate-900 dark:text-white">
                  Payment Date
                </Label>
                <Input
                  id="paidAt"
                  type="date"
                  value={paymentForm.paidAt.toISOString().split('T')[0]}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: new Date(e.target.value) })}
                  className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expiresAt" className="text-slate-900 dark:text-white">
                  Expiry Date
                </Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={paymentForm.expiresAt.toISOString().split('T')[0]}
                  onChange={(e) => setPaymentForm({ ...paymentForm, expiresAt: new Date(e.target.value) })}
                  className="bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentModalOpen(false)}
              className="border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePayment}
              disabled={actionLoading === selectedMember?.uid}
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
            >
              {actionLoading === selectedMember?.uid ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


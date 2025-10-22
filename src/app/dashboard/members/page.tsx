'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Calendar,
  DollarSign,
  Crown,
  Zap,
  Shield
} from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  plan: 'STARTER' | 'PRO' | 'ELITE'
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL'
  joinDate: string
  lastPayment: string
  totalPaid: number
  telegramStatus: 'CONNECTED' | 'PENDING' | 'NOT_CONNECTED'
  discordStatus: 'CONNECTED' | 'PENDING' | 'NOT_CONNECTED'
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'all',
    plan: 'all',
    search: ''
  })

  // Mock data for demonstration
  useEffect(() => {
    const mockMembers: Member[] = [
      {
        id: '1',
        name: 'John Smith',
        email: 'john@example.com',
        plan: 'PRO',
        status: 'ACTIVE',
        joinDate: '2024-01-15',
        lastPayment: '2024-01-15',
        totalPaid: 297,
        telegramStatus: 'CONNECTED',
        discordStatus: 'CONNECTED'
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        plan: 'ELITE',
        status: 'ACTIVE',
        joinDate: '2024-01-10',
        lastPayment: '2024-01-10',
        totalPaid: 597,
        telegramStatus: 'CONNECTED',
        discordStatus: 'CONNECTED'
      },
      {
        id: '3',
        name: 'Mike Wilson',
        email: 'mike@example.com',
        plan: 'STARTER',
        status: 'ACTIVE',
        joinDate: '2024-01-20',
        lastPayment: '2024-01-20',
        totalPaid: 49,
        telegramStatus: 'PENDING',
        discordStatus: 'NOT_CONNECTED'
      },
      {
        id: '4',
        name: 'Emma Davis',
        email: 'emma@example.com',
        plan: 'PRO',
        status: 'CANCELLED',
        joinDate: '2023-12-01',
        lastPayment: '2023-12-01',
        totalPaid: 198,
        telegramStatus: 'NOT_CONNECTED',
        discordStatus: 'NOT_CONNECTED'
      }
    ]
    
    setMembers(mockMembers)
    setFilteredMembers(mockMembers)
    setLoading(false)
  }, [])

  // Filter members
  useEffect(() => {
    let filtered = members

    if (filter.status !== 'all') {
      filtered = filtered.filter(member => member.status === filter.status)
    }

    if (filter.plan !== 'all') {
      filtered = filtered.filter(member => member.plan === filter.plan)
    }

    if (filter.search) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        member.email.toLowerCase().includes(filter.search.toLowerCase())
      )
    }

    setFilteredMembers(filtered)
  }, [members, filter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-600 text-white">Active</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-600 text-white">Cancelled</Badge>
      case 'EXPIRED':
        return <Badge className="bg-gray-600 text-white">Expired</Badge>
      case 'TRIAL':
        return <Badge className="bg-red-600 text-white">Trial</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'STARTER':
        return <Badge className="bg-gray-600 text-white">Starter</Badge>
      case 'PRO':
        return <Badge className="bg-red-600 text-white">Pro</Badge>
      case 'ELITE':
        return <Badge className="bg-yellow-600 text-black">Elite</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">{plan}</Badge>
    }
  }

  const getConnectionStatus = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <Badge className="bg-green-600 text-white">Connected</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-600 text-black">Pending</Badge>
      case 'NOT_CONNECTED':
        return <Badge className="bg-gray-600 text-white">Not Connected</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-800 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Members Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-red-500" />
                Members Management
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                Manage your subscribers and track their activity
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white">
                <Users className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Members</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{members.length}</div>
            <p className="text-xs text-gray-400">All time subscribers</p>
          </CardContent>
        </Card>

        <Card className="glass border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {members.filter(m => m.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-gray-400">Currently subscribed</p>
          </CardContent>
        </Card>

        <Card className="glass border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${members.reduce((sum, m) => sum + (m.status === 'ACTIVE' ? (m.plan === 'STARTER' ? 49 : m.plan === 'PRO' ? 99 : 199) : 0), 0)}
            </div>
            <p className="text-xs text-gray-400">This month</p>
          </CardContent>
        </Card>

        <Card className="glass border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Churn Rate</CardTitle>
            <Zap className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">5.2%</div>
            <p className="text-xs text-gray-400">Monthly churn</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Status</label>
              <Select value={filter.status} onValueChange={(value) => setFilter({...filter, status: value})}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">All Status</SelectItem>
                  <SelectItem value="ACTIVE" className="text-white hover:bg-gray-700">Active</SelectItem>
                  <SelectItem value="CANCELLED" className="text-white hover:bg-gray-700">Cancelled</SelectItem>
                  <SelectItem value="EXPIRED" className="text-white hover:bg-gray-700">Expired</SelectItem>
                  <SelectItem value="TRIAL" className="text-white hover:bg-gray-700">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Plan</label>
              <Select value={filter.plan} onValueChange={(value) => setFilter({...filter, plan: value})}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">All Plans</SelectItem>
                  <SelectItem value="STARTER" className="text-white hover:bg-gray-700">Starter</SelectItem>
                  <SelectItem value="PRO" className="text-white hover:bg-gray-700">Pro</SelectItem>
                  <SelectItem value="ELITE" className="text-white hover:bg-gray-700">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Search</label>
              <Input 
                placeholder="Search members..." 
                value={filter.search}
                onChange={(e) => setFilter({...filter, search: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-white">Members ({filteredMembers.length})</CardTitle>
          <CardDescription className="text-gray-400">
            Manage your subscribers and their subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-red rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-medium">{member.name}</h3>
                      {getStatusBadge(member.status)}
                      {getPlanBadge(member.plan)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        {member.email}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Joined {new Date(member.joinDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-white font-semibold">${member.totalPaid}</div>
                    <div className="text-sm text-gray-400">Total Paid</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">Connections</div>
                    <div className="flex space-x-2">
                      {getConnectionStatus(member.telegramStatus)}
                      {getConnectionStatus(member.discordStatus)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <Card className="glass">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No members found</h3>
            <p className="text-gray-400">Try adjusting your filters or check back later.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

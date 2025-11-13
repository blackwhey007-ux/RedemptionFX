import { NextRequest, NextResponse } from 'next/server'
import { getExpiredVIPMembers, updateMemberRole } from '@/lib/memberService'
import { getTelegramSettings, removeMemberFromTelegramGroup } from '@/lib/telegramService'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'

interface RemovalLog {
  memberId: string
  email: string
  telegramUsername?: string
  telegramUserId?: number
  success: boolean
  error?: string
  roleDowngraded: boolean
  telegramRemoved: boolean
  removedAt: Date
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting subscription expiry check...')
    
    // Get expired VIP members
    const expiredMembers = await getExpiredVIPMembers()
    
    if (expiredMembers.length === 0) {
      console.log('✅ No expired VIP members found')
      return NextResponse.json({
        success: true,
        message: 'No expired VIP members found',
        expiredCount: 0,
        removedCount: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`📋 Found ${expiredMembers.length} expired VIP members`)

    // Get Telegram settings
    const telegramSettings = await getTelegramSettings()
    if (!telegramSettings?.botToken) {
      console.warn('⚠️ Telegram not configured, skipping Telegram removal')
    }

    // Process each expired member
    const removalLogs: RemovalLog[] = []
    let successCount = 0
    let errorCount = 0
    let roleDowngradeCount = 0
    let telegramRemovedCount = 0

    for (const member of expiredMembers) {
      const log: RemovalLog = {
        memberId: member.uid,
        email: member.email,
        telegramUsername: member.profileSettings?.telegramUsername,
        telegramUserId: member.profileSettings?.telegramUserId,
        success: false,
        roleDowngraded: false,
        telegramRemoved: false,
        removedAt: new Date()
      }

      try {
        // Try to remove from Telegram if configured
        if (telegramSettings?.botToken) {
          const telegramUserId = member.profileSettings?.telegramUserId
          const telegramUsername = member.profileSettings?.telegramUsername
          const groupId = telegramSettings.groupId || telegramSettings.channelId

          if (telegramUserId && groupId) {
            // We have the Telegram user ID, can remove directly
            try {
              const removeResult = await removeMemberFromTelegramGroup(groupId, telegramUserId, telegramSettings.botToken)
              if (removeResult.success) {
                log.telegramRemoved = true
                telegramRemovedCount++
                console.log(`✅ Removed ${member.email} (${telegramUsername || telegramUserId}) from Telegram VIP group`)
              } else {
                console.warn(`⚠️ Failed to remove ${member.email} from Telegram: ${removeResult.error}`)
                log.error = `Telegram removal failed: ${removeResult.error}`
              }
            } catch (telegramError) {
              console.error(`❌ Error removing ${member.email} from Telegram:`, telegramError)
              log.error = `Telegram removal error: ${telegramError instanceof Error ? telegramError.message : 'Unknown error'}`
            }
          } else if (!telegramUserId && telegramUsername && groupId) {
            // Have username but not user ID - log warning
            console.warn(`⚠️ Cannot remove ${member.email} from Telegram: Need telegramUserId (username: ${telegramUsername}). Store telegramUserId when users join the group.`)
            log.error = 'Telegram user ID not available. Store telegramUserId in profileSettings when users join the group.'
          } else if (!groupId) {
            console.warn(`⚠️ Telegram group/channel ID not configured`)
            log.error = 'Telegram group/channel ID not configured'
          } else if (!telegramUsername && !telegramUserId) {
            console.log(`⏭️ Skipping Telegram removal for ${member.email}: No Telegram username or user ID`)
            log.error = 'No Telegram username or user ID found in profile'
          }
        }

        // Downgrade role from VIP to guest
        try {
          await updateMemberRole(member.uid, 'guest')
          log.roleDowngraded = true
          roleDowngradeCount++
          console.log(`✅ Downgraded ${member.email} from VIP to guest`)
        } catch (roleError) {
          console.error(`❌ Error downgrading role for ${member.email}:`, roleError)
          log.error = `Role downgrade failed: ${roleError instanceof Error ? roleError.message : 'Unknown error'}`
        }

        // Mark as success if role was downgraded (Telegram removal is optional)
        if (log.roleDowngraded) {
          log.success = true
          successCount++
        } else {
          errorCount++
        }

      } catch (error) {
        console.error(`❌ Error processing expired member ${member.email}:`, error)
        log.error = error instanceof Error ? error.message : 'Unknown error'
        errorCount++
      }

      removalLogs.push(log)
    }

    // Save audit log to Firestore
    try {
      await addDoc(collection(db, 'subscriptionExpiryLogs'), {
        timestamp: Timestamp.now(),
        expiredCount: expiredMembers.length,
        processedCount: removalLogs.length,
        successCount,
        errorCount,
        roleDowngradeCount,
        telegramRemovedCount,
        logs: removalLogs,
        telegramConfigured: !!telegramSettings?.botToken
      })
      console.log('✅ Audit log saved')
    } catch (logError) {
      console.error('⚠️ Failed to save audit log:', logError)
      // Don't fail the entire operation if logging fails
    }

    console.log(`✅ Subscription expiry check completed: ${successCount} processed, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredMembers.length} expired VIP members`,
      expiredCount: expiredMembers.length,
      processedCount: removalLogs.length,
      successCount,
      errorCount,
      roleDowngradeCount,
      telegramRemovedCount,
      timestamp: new Date().toISOString(),
      summary: {
        telegramRemoved: removalLogs.filter(log => log.telegramRemoved).length,
        roleDowngraded: roleDowngradeCount,
        errors: removalLogs.filter(log => !log.success).map(log => ({
          email: log.email,
          error: log.error
        })),
        warnings: removalLogs.filter(log => log.error?.includes('telegramUserId')).length > 0 
          ? [`Some members could not be removed from Telegram because telegramUserId is missing. Consider implementing a bot webhook to capture telegramUserId when users join.`]
          : []
      }
    })

  } catch (error) {
    console.error('❌ Error in subscription expiry check:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  try {
    // Try to parse body if it exists, but don't fail if it's empty
    try {
      const body = await request.json()
      // Body is optional, we don't use it
    } catch {
      // Empty body is fine, continue
    }
    
    // Check authorization - require CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    
    // Require CRON_SECRET for security
    if (!isCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Same logic as GET
    return GET(request)
  } catch (error) {
    console.error('❌ Error in manual subscription expiry check:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


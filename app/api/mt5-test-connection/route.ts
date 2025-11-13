import { NextRequest, NextResponse } from 'next/server'
import { getMT5Settings } from '@/lib/mt5SettingsService'
import { testMetaAPIConnection } from '@/lib/metaapiRestClient'

interface CredentialsInput {
  accountId?: string | null
  token?: string | null
  regionUrl?: string | null
}

async function resolveCredentials(
  input: CredentialsInput
): Promise<{ accountId: string; token: string; regionUrl?: string }> {
  const settings = await getMT5Settings()

  const accountId = (input.accountId || settings?.accountId || '').trim()
  if (!accountId) {
    throw new ResponseError('MetaAPI account ID missing. Provide it in the request body or save it in settings.', 400)
  }

  const token = (input.token || settings?.token || process.env.METAAPI_TOKEN || '').trim()
  if (!token) {
    throw new ResponseError('MetaAPI token missing. Include it in the request body or configure METAAPI_TOKEN.', 500)
  }

  const resolvedRegion = (
    input.regionUrl?.trim() ||
    settings?.regionUrl?.trim() ||
    process.env.METAAPI_REGION_URL?.trim() ||
    ''
  ) || undefined

  return {
    accountId,
    token,
    regionUrl: resolvedRegion
  }
}

class ResponseError extends Error {
  status: number

  constructor(message: string, status: number = 500) {
    super(message)
    this.status = status
    this.name = 'ResponseError'
  }
}

function formatDiagnosticResult(diagnostics: Awaited<ReturnType<typeof testMetaAPIConnection>>) {
  const isHealthy =
    diagnostics.managementApiWorks &&
    diagnostics.accountExists &&
    diagnostics.accountDeployed &&
    diagnostics.accountConnected &&
    diagnostics.tradingApiWorks

  return {
    success: true,
    diagnostics,
    isHealthy
  }
}

/**
 * API endpoint to test MetaAPI connection and return detailed diagnostics
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Running MetaAPI connection diagnostics (GET)...')

    const { accountId, token, regionUrl } = await resolveCredentials({})

    console.log(`🔍 Testing connection for account: ${accountId}`)
    const diagnostics = await testMetaAPIConnection(accountId, token, regionUrl)

    console.log('✅ Diagnostics complete')
    return NextResponse.json(formatDiagnosticResult(diagnostics))
  } catch (error) {
    console.error('❌ Error running diagnostics (GET):', error)
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Running MetaAPI connection diagnostics (POST)...')
    let payload: CredentialsInput = {}

    try {
      payload = await request.json()
    } catch {
      payload = {}
    }

    const { accountId, token, regionUrl } = await resolveCredentials(payload)

    console.log(`🔍 Testing connection for account: ${accountId}`)
    const diagnostics = await testMetaAPIConnection(accountId, token, regionUrl)

    console.log('✅ Diagnostics complete')
    return NextResponse.json(formatDiagnosticResult(diagnostics))
  } catch (error) {
    console.error('❌ Error running diagnostics (POST):', error)
    return handleError(error)
  }
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const status = error instanceof ResponseError ? error.status : 500

  return NextResponse.json(
    {
      success: false,
      error: message,
      diagnostics: null
    },
    { status }
  )
}


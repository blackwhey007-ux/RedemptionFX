'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  RefreshCw,
  Eye,
  Trash2
} from 'lucide-react'

interface ImportResult {
  success: boolean
  message: string
  summary: {
    totalTrades: number
    newTrades: number
    updatedTrades: number
    skippedTrades: number
    errors: number
  }
  errors: string[]
}

interface ImportHistory {
  id: string
  method: 'manual' | 'api'
  importedAt: string
  tradesCount: number
  newTrades: number
  updatedTrades: number
  skippedTrades: number
  fileName?: string
  importedBy: string
  status: 'success' | 'partial' | 'failed'
  errors?: string[]
}

export function CsvImportPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file')
        return
      }
      
      setFile(selectedFile)
      setImportResult(null)
      
      // Preview first few lines
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const lines = content.split('\n').slice(0, 6) // First 6 lines
        setPreview(lines.join('\n'))
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.toLowerCase().endsWith('.csv')) {
      setFile(droppedFile)
      setImportResult(null)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const lines = content.split('\n').slice(0, 6)
        setPreview(lines.join('\n'))
      }
      reader.readAsText(droppedFile)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/vip-sync/manual', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      setImportResult(result)

      if (result.success) {
        // Refresh import history
        await loadImportHistory()
        // Clear file
        setFile(null)
        setPreview('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Import failed',
        summary: { totalTrades: 0, newTrades: 0, updatedTrades: 0, skippedTrades: 0, errors: 1 },
        errors: ['Network error occurred']
      })
    } finally {
      setImporting(false)
    }
  }

  const loadImportHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch('/api/admin/vip-sync/manual')
      const data = await response.json()
      
      if (data.success) {
        setImportHistory(data.importHistory)
      }
    } catch (error) {
      console.error('Error loading import history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Ticket,Open Time,Type,Size,Item,Price,S/L,T/P,Close Time,Price,Commission,Swap,Profit
12345,2024.01.01 10:30,buy,0.10,EURUSD,1.0850,0,0,2024.01.01 15:45,1.0920,0,-0.50,70.00
67890,2024.01.01 11:15,sell,0.05,GBPUSD,1.2750,0,0,2024.01.01 16:30,1.2700,0,-0.25,25.00`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mt5-export-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV Import
          </CardTitle>
          <CardDescription>
            Upload MT5 CSV export file to import VIP trading results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-lg font-medium text-green-600 dark:text-green-400">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="text-lg font-medium">Drop CSV file here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-2">
              <h4 className="font-medium">Preview (first 6 lines):</h4>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                {preview}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              onClick={downloadTemplate}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>

            <div className="flex items-center gap-2">
              {file && (
                <Button
                  onClick={() => {
                    setFile(null)
                    setPreview('')
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              )}
              
              <Button
                onClick={handleImport}
                disabled={!file || importing}
                className="flex items-center gap-2"
              >
                {importing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {importing ? 'Importing...' : 'Import Trades'}
              </Button>
            </div>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing trades...</span>
                <span>Please wait</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Result */}
          {importResult && (
            <div className={`p-4 rounded-lg border ${
              importResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    importResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                    {importResult.message}
                  </h4>
                  
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-1 font-medium">{importResult.summary?.totalTrades || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">New:</span>
                      <span className="ml-1 font-medium text-green-600">{importResult.summary?.newTrades || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Updated:</span>
                      <span className="ml-1 font-medium text-blue-600">{importResult.summary?.updatedTrades || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Skipped:</span>
                      <span className="ml-1 font-medium text-yellow-600">{importResult.summary?.skippedTrades || 0}</span>
                    </div>
                  </div>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                        View {importResult.errors.length} error(s)
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Import History
          </CardTitle>
          <CardDescription>
            Recent CSV import activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading history...</span>
              </div>
            ) : importHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No import history available
              </div>
            ) : (
              importHistory.map((import_) => (
                <div key={import_.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(import_.status)}
                    <div>
                      <div className="font-medium">
                        {formatTimeAgo(import_.importedAt)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {import_.tradesCount} trades • {import_.newTrades} new • {import_.skippedTrades} skipped
                        {import_.fileName && ` • ${import_.fileName}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(import_.status)}>
                      {import_.status}
                    </Badge>
                    {import_.errors && import_.errors.length > 0 && (
                      <Button variant="outline" size="sm">
                        View Errors
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

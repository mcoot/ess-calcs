'use client'

import { useState, useRef, useCallback } from 'react'
import { parseAnyCsv } from '@/lib/csv-parser'
import {
  addSalesRecords,
  addVestingRecords,
  addRsuReleaseRecords,
  replaceSalesData,
  replaceVestingData,
  replaceRsuReleaseData,
  loadImportedData,
} from '@/lib/storage'
import type { ImportedData, CsvFileType } from '@/types'

interface CsvImportComponentProps {
  onDataImported: (data: ImportedData) => void
}

interface ImportResult {
  fileName: string
  type: CsvFileType
  recordsCount: number
  errors: string[]
  warnings: string[]
  skippedRows: number
}

export function CsvImportComponent({
  onDataImported,
}: CsvImportComponentProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [replaceMode, setReplaceMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File): Promise<ImportResult> => {
    const text = await file.text()
    const parseResult = parseAnyCsv(text)

    const result: ImportResult = {
      fileName: file.name,
      type: parseResult.type,
      recordsCount: 0,
      errors: [],
      warnings: [],
      skippedRows: 0,
    }

    if (parseResult.type === 'sales' && parseResult.sales) {
      result.recordsCount = parseResult.sales.data.length
      result.errors = parseResult.sales.errors
      result.warnings = parseResult.sales.warnings
      result.skippedRows = parseResult.sales.skippedRows

      if (parseResult.sales.data.length > 0) {
        if (replaceMode) {
          replaceSalesData(parseResult.sales.data)
        } else {
          addSalesRecords(parseResult.sales.data)
        }
      }
    } else if (parseResult.type === 'vesting' && parseResult.vesting) {
      result.recordsCount = parseResult.vesting.data.length
      result.errors = parseResult.vesting.errors
      result.warnings = parseResult.vesting.warnings
      result.skippedRows = parseResult.vesting.skippedRows

      if (parseResult.vesting.data.length > 0) {
        if (replaceMode) {
          replaceVestingData(parseResult.vesting.data)
        } else {
          addVestingRecords(parseResult.vesting.data)
        }
      }
    } else if (parseResult.type === 'rsu-releases' && parseResult.rsuReleases) {
      result.recordsCount = parseResult.rsuReleases.data.length
      result.errors = parseResult.rsuReleases.errors
      result.warnings = parseResult.rsuReleases.warnings
      result.skippedRows = parseResult.rsuReleases.skippedRows

      if (parseResult.rsuReleases.data.length > 0) {
        if (replaceMode) {
          replaceRsuReleaseData(parseResult.rsuReleases.data)
        } else {
          addRsuReleaseRecords(parseResult.rsuReleases.data)
        }
      }
    } else {
      result.errors.push(
        'Unable to detect CSV format. Please check file structure.'
      )
    }

    return result
  }

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setIsProcessing(true)
      setImportResults([])

      const results: ImportResult[] = []

      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
          results.push({
            fileName: file.name,
            type: 'unknown',
            recordsCount: 0,
            errors: ['File must be a CSV (.csv) file'],
            warnings: [],
            skippedRows: 0,
          })
          continue
        }

        try {
          const result = await processFile(file)
          results.push(result)
        } catch (error) {
          results.push({
            fileName: file.name,
            type: 'unknown',
            recordsCount: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            warnings: [],
            skippedRows: 0,
          })
        }
      }

      setImportResults(results)
      setIsProcessing(false)

      // Refresh data and notify parent
      const updatedData = loadImportedData()
      onDataImported(updatedData)
    },
    [onDataImported, replaceMode, processFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div>
      <h2>Import CSV Files</h2>

      {/* Replace Mode Toggle */}
      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input
            type="checkbox"
            checked={replaceMode}
            onChange={(e) => setReplaceMode(e.target.checked)}
            style={{ marginRight: '0.5rem' }}
          />
          Replace existing data (instead of adding to it)
        </label>
      </div>

      {/* File Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        style={{
          border: `2px dashed ${isDragging ? '#0066cc' : '#ccc'}`,
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: isDragging ? '#f0f8ff' : '#fafafa',
          cursor: 'pointer',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {isProcessing ? (
          <div>
            <div>Processing files...</div>
            <div
              style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}
            >
              Please wait while we parse your CSV files
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              {isDragging
                ? 'Drop files here'
                : 'Drop CSV files here or click to browse'}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              Supports share sales, vesting schedules, and RSU release CSVs
            </div>
          </div>
        )}
      </div>

      {/* Import Results */}
      {importResults.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Import Results</h3>
          {importResults.map((result, index) => (
            <div
              key={index}
              style={{
                marginBottom: '1rem',
                padding: '1rem',
                border: `1px solid ${result.errors.length > 0 ? '#ff6b6b' : '#4ecdc4'}`,
                borderRadius: '4px',
                backgroundColor:
                  result.errors.length > 0 ? '#fff5f5' : '#f0fff4',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {result.fileName}
              </div>

              <div style={{ fontSize: '0.9rem' }}>
                <div>Type: {result.type}</div>
                <div>Records imported: {result.recordsCount}</div>
                {result.skippedRows > 0 && (
                  <div>Rows skipped: {result.skippedRows}</div>
                )}
              </div>

              {result.warnings.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#ff9500' }}>
                    Warnings:
                  </div>
                  <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                    {result.warnings.map((warning, i) => (
                      <li
                        key={i}
                        style={{ fontSize: '0.85rem', color: '#ff9500' }}
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#ff6b6b' }}>
                    Errors:
                  </div>
                  <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                    {result.errors.map((error, i) => (
                      <li
                        key={i}
                        style={{ fontSize: '0.85rem', color: '#ff6b6b' }}
                      >
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Usage Instructions */}
      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <h4>Supported File Formats:</h4>
        <ul>
          <li>
            <strong>Share Sales Reports:</strong> CSV files containing sale
            transactions with columns like &ldquo;Withdrawal Reference
            Number&rdquo;, &ldquo;Sale Date&rdquo;, &ldquo;Shares Sold&rdquo;,
            &ldquo;Sale Proceeds&rdquo;, etc.
          </li>
          <li>
            <strong>Vesting Schedules:</strong> CSV files containing vesting
            information with columns like &ldquo;Grant Date&rdquo;, &ldquo;Grant
            Number&rdquo;, &ldquo;Vest Date&rdquo;, &ldquo;Shares&rdquo;, etc.
          </li>
          <li>
            <strong>RSU Releases:</strong> CSV files containing actual RSU
            vesting events with columns like &ldquo;Release Date&rdquo;,
            &ldquo;Shares Vested&rdquo;, &ldquo;Fair Market Value Per
            Share&rdquo;, &ldquo;Release Reference Number&rdquo;, etc.
          </li>
        </ul>
        <p>
          The system will automatically detect the file type and parse
          accordingly. You can import multiple files at once.
        </p>
      </div>
    </div>
  )
}

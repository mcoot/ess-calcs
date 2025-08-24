'use client'

import { useState, useEffect } from 'react'
import { CsvImportComponent } from '@/components/CsvImportComponent'
import { ImportedDataViewer } from '@/components/ImportedDataViewer'
import { loadImportedData, getDataSummary } from '@/lib/storage'
import type { ImportedData } from '@/types'

export default function ImportPage() {
  const [importedData, setImportedData] = useState<ImportedData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load data on mount
    const data = loadImportedData()
    setImportedData(data)
    setIsLoading(false)
  }, [])

  const handleDataImported = (newData: ImportedData) => {
    setImportedData(newData)
  }

  if (isLoading) {
    return (
      <main>
        <div className="container">
          <div>Loading...</div>
        </div>
      </main>
    )
  }

  const summary = getDataSummary()

  return (
    <main>
      <div className="container">
        <h1>Import CSV Data</h1>
        <p>
          Upload your share sale reports and vesting schedule CSV files for
          processing.
        </p>

        {/* Data Summary */}
        <div
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <h3>Current Data Summary</h3>
          <ul style={{ margin: 0 }}>
            <li>Sales records: {summary.salesCount}</li>
            <li>Vesting records: {summary.vestingCount}</li>
            <li>
              Total shares sold: {summary.totalSharesSold.toLocaleString()}
            </li>
            <li>
              Total sale proceeds: $
              {summary.totalSalesProceeds.toLocaleString()}
            </li>
            <li>
              Total shares vested: {summary.totalSharesVested.toLocaleString()}
            </li>
            {summary.lastUpdated && (
              <li>
                Last updated: {new Date(summary.lastUpdated).toLocaleString()}
              </li>
            )}
          </ul>
        </div>

        {/* CSV Import Component */}
        <CsvImportComponent onDataImported={handleDataImported} />

        {/* Data Viewer */}
        {importedData &&
          (importedData.sales.length > 0 ||
            importedData.vesting.length > 0) && (
            <div style={{ marginTop: '2rem' }}>
              <ImportedDataViewer data={importedData} />
            </div>
          )}
      </div>
    </main>
  )
}

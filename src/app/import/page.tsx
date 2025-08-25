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
      <main className="min-h-screen p-8 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-gray-600">Loading...</div>
        </div>
      </main>
    )
  }

  const summary = getDataSummary()

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Import CSV Data
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Upload your share sale reports and vesting schedule CSV files for
          processing.
        </p>

        {/* Data Summary */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Current Data Summary
          </h3>
          <ul className="space-y-2 text-gray-600">
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
            <div className="mt-8">
              <ImportedDataViewer data={importedData} />
            </div>
          )}
      </div>
    </main>
  )
}

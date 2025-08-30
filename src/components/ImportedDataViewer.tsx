'use client'

import { useState } from 'react'
import { clearImportedData, exportDataAsJson } from '@/lib/storage'
import type {
  ImportedData,
  ShareSaleRecord,
  VestingRecord,
  RsuReleaseRecord,
} from '@/types'

interface ImportedDataViewerProps {
  data: ImportedData
}

interface TableProps<T> {
  data: T[]
  columns: Array<{
    key: keyof T
    label: string
    format?: (value: unknown) => string
  }>
  maxRows?: number
}

function DataTable<T>({ data, columns, maxRows = 100 }: TableProps<T>) {
  const [showAll, setShowAll] = useState(false)

  const displayData = showAll ? data : data.slice(0, maxRows)
  const hasMore = data.length > maxRows

  return (
    <div>
      {hasMore && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {showAll
              ? `Show first ${maxRows} rows`
              : `Show all ${data.length} rows`}
          </button>
          <span style={{ marginLeft: '1rem', color: '#666' }}>
            Displaying {displayData.length} of {data.length} records
          </span>
        </div>
      )}

      <div
        style={{
          overflowX: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{
                    padding: '0.75rem 0.5rem',
                    textAlign: 'left',
                    borderBottom: '2px solid #ddd',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9',
                }}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    style={{
                      padding: '0.5rem',
                      borderBottom: '1px solid #eee',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {column.format
                      ? column.format(row[column.key])
                      : String(row[column.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ImportedDataViewer({ data }: ImportedDataViewerProps) {
  const [activeTab, setActiveTab] = useState<
    'sales' | 'vesting' | 'rsu-releases'
  >('sales')
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const handleClearData = () => {
    if (clearImportedData()) {
      window.location.reload() // Simple way to refresh the data
    }
  }

  const handleExportData = () => {
    const jsonData = exportDataAsJson()
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ess-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (value: unknown) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(Number(value) || 0)

  const formatNumber = (value: unknown) =>
    new Intl.NumberFormat('en-AU').format(Number(value) || 0)

  const formatBoolean = (value: unknown) => (Boolean(value) ? 'Yes' : 'No')

  const salesColumns = [
    { key: 'saleDate' as keyof ShareSaleRecord, label: 'Sale Date' },
    { key: 'withdrawalRef' as keyof ShareSaleRecord, label: 'Withdrawal Ref' },
    { key: 'employeeGrantNumber' as keyof ShareSaleRecord, label: 'Grant #' },
    { key: 'grantName' as keyof ShareSaleRecord, label: 'Grant Name' },
    {
      key: 'sharesSold' as keyof ShareSaleRecord,
      label: 'Shares Sold',
      format: formatNumber,
    },
    {
      key: 'salePricePerShare' as keyof ShareSaleRecord,
      label: 'Price/Share',
      format: formatCurrency,
    },
    {
      key: 'saleProceeds' as keyof ShareSaleRecord,
      label: 'Sale Proceeds',
      format: formatCurrency,
    },
    {
      key: 'brokerageCommission' as keyof ShareSaleRecord,
      label: 'Brokerage',
      format: formatCurrency,
    },
    {
      key: 'soldWithin30Days' as keyof ShareSaleRecord,
      label: '30-Day Rule',
      format: formatBoolean,
    },
    {
      key: 'originalAcquisitionDate' as keyof ShareSaleRecord,
      label: 'Acquisition Date',
    },
  ]

  const vestingColumns = [
    { key: 'vestDate' as keyof VestingRecord, label: 'Vest Date' },
    { key: 'grantNumber' as keyof VestingRecord, label: 'Grant #' },
    { key: 'grantName' as keyof VestingRecord, label: 'Grant Name' },
    { key: 'grantDate' as keyof VestingRecord, label: 'Grant Date' },
    {
      key: 'shares' as keyof VestingRecord,
      label: 'Shares',
      format: formatNumber,
    },
    { key: 'grantType' as keyof VestingRecord, label: 'Type' },
    { key: 'grantReason' as keyof VestingRecord, label: 'Reason' },
  ]

  const rsuReleaseColumns = [
    { key: 'releaseDate' as keyof RsuReleaseRecord, label: 'Release Date' },
    { key: 'grantNumber' as keyof RsuReleaseRecord, label: 'Grant #' },
    { key: 'grantName' as keyof RsuReleaseRecord, label: 'Grant Name' },
    { key: 'grantDate' as keyof RsuReleaseRecord, label: 'Grant Date' },
    {
      key: 'sharesVested' as keyof RsuReleaseRecord,
      label: 'Shares Vested',
      format: formatNumber,
    },
    {
      key: 'fairMarketValuePerShare' as keyof RsuReleaseRecord,
      label: 'FMV/Share',
      format: formatCurrency,
    },
    {
      key: 'totalValue' as keyof RsuReleaseRecord,
      label: 'Total Value',
      format: formatCurrency,
    },
    {
      key: 'sharesHeld' as keyof RsuReleaseRecord,
      label: 'Shares Held',
      format: formatNumber,
    },
    {
      key: 'releaseReferenceNumber' as keyof RsuReleaseRecord,
      label: 'Release Ref',
    },
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2>Imported Data</h2>
        <div>
          <button
            onClick={handleExportData}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '0.5rem',
            }}
          >
            Export JSON
          </button>
          <button
            onClick={() => setShowConfirmClear(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear All Data
          </button>
        </div>
      </div>

      {/* Confirm Clear Dialog */}
      {showConfirmClear && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '400px',
              textAlign: 'center',
            }}
          >
            <h3>Confirm Clear Data</h3>
            <p>
              Are you sure you want to clear all imported data? This action
              cannot be undone.
            </p>
            <div>
              <button
                onClick={() => setShowConfirmClear(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '0.5rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('sales')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: activeTab === 'sales' ? '#0066cc' : '#f8f9fa',
            color: activeTab === 'sales' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '4px 0 0 0',
            cursor: 'pointer',
          }}
        >
          Sales ({data.sales.length})
        </button>
        <button
          onClick={() => setActiveTab('vesting')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: activeTab === 'vesting' ? '#0066cc' : '#f8f9fa',
            color: activeTab === 'vesting' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderLeft: 'none',
            borderRadius: '0',
            cursor: 'pointer',
          }}
        >
          Vesting ({data.vesting.length})
        </button>
        <button
          onClick={() => setActiveTab('rsu-releases')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor:
              activeTab === 'rsu-releases' ? '#0066cc' : '#f8f9fa',
            color: activeTab === 'rsu-releases' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderLeft: 'none',
            borderRadius: '0 4px 0 0',
            cursor: 'pointer',
          }}
        >
          RSU Releases ({data.rsuReleases?.length || 0})
        </button>
      </div>

      {/* Data Tables */}
      {activeTab === 'sales' && (
        <div>
          {data.sales.length === 0 ? (
            <p>No sales data imported yet.</p>
          ) : (
            <DataTable data={data.sales} columns={salesColumns} />
          )}
        </div>
      )}

      {activeTab === 'vesting' && (
        <div>
          {data.vesting.length === 0 ? (
            <p>No vesting data imported yet.</p>
          ) : (
            <DataTable data={data.vesting} columns={vestingColumns} />
          )}
        </div>
      )}

      {activeTab === 'rsu-releases' && (
        <div>
          {!data.rsuReleases || data.rsuReleases.length === 0 ? (
            <p>No RSU release data imported yet.</p>
          ) : (
            <DataTable data={data.rsuReleases} columns={rsuReleaseColumns} />
          )}
        </div>
      )}
    </div>
  )
}

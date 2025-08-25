'use client'

import { useState, useEffect, useMemo } from 'react'
import { loadImportedData } from '@/lib/storage'
import type { ImportedData, ShareSaleRecord, VestingRecord } from '@/types'

type TransactionType = 'all' | 'sales' | 'vesting'
type SortField = 'date' | 'amount' | 'type' | 'currency'
type SortDirection = 'asc' | 'desc'

interface CombinedTransaction {
  id: string
  type: 'sale' | 'vesting'
  date: string
  amount: number
  currency: string
  shares: number
  description: string
  original: ShareSaleRecord | VestingRecord
}

export default function TransactionsPage() {
  const [data, setData] = useState<ImportedData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<TransactionType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedTransaction, setSelectedTransaction] =
    useState<CombinedTransaction | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const importedData = loadImportedData()
    setData(importedData)
    setIsLoading(false)
  }, [])

  const combinedTransactions: CombinedTransaction[] = useMemo(() => {
    if (!data) return []

    const salesTransactions: CombinedTransaction[] = data.sales.map((sale) => ({
      id: sale.id,
      type: 'sale' as const,
      date: sale.saleDate,
      amount: sale.saleProceeds,
      currency: sale.currency,
      shares: sale.sharesSold,
      description: `Sale of ${sale.sharesSold} shares - ${sale.grantName}`,
      original: sale,
    }))

    const vestingTransactions: CombinedTransaction[] = data.vesting.map(
      (vest) => ({
        id: vest.id,
        type: 'vesting' as const,
        date: vest.vestDate,
        amount: 0, // Vesting doesn't have a direct monetary amount
        currency: 'N/A',
        shares: vest.shares,
        description: `Vesting of ${vest.shares} shares - ${vest.grantName}`,
        original: vest,
      })
    )

    return [...salesTransactions, ...vestingTransactions]
  }, [data])

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = combinedTransactions

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter((t) => t.type === filter.replace('s', ''))
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(term) ||
          t.id.toLowerCase().includes(term) ||
          t.currency.toLowerCase().includes(term)
      )
    }

    // Apply date range filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.date)
        const fromDate = dateFrom ? new Date(dateFrom) : null
        const toDate = dateTo ? new Date(dateTo) : null

        if (fromDate && toDate) {
          return transactionDate >= fromDate && transactionDate <= toDate
        } else if (fromDate) {
          return transactionDate >= fromDate
        } else if (toDate) {
          return transactionDate <= toDate
        }
        return true
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date)
          bValue = new Date(b.date)
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'currency':
          aValue = a.currency
          bValue = b.currency
          break
        default:
          aValue = a.date
          bValue = b.date
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [
    combinedTransactions,
    filter,
    searchTerm,
    sortField,
    sortDirection,
    dateFrom,
    dateTo,
  ])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'N/A' || amount === 0) return 'N/A'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'AUD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU')
  }

  const clearDateFilters = () => {
    setDateFrom('')
    setDateTo('')
  }

  const clearAllFilters = () => {
    setFilter('all')
    setSearchTerm('')
    setDateFrom('')
    setDateTo('')
  }

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-gray-600">Loading transactions...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Transaction Processing
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Review and validate your imported transactions.
        </p>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              {combinedTransactions.length}
            </div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {data?.sales.length || 0}
            </div>
            <div className="text-sm text-gray-600">Share Sales</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">
              {data?.vesting.length || 0}
            </div>
            <div className="text-sm text-gray-600">Vesting Events</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="space-y-4">
            {/* First row: Search and Transaction Type */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search transactions
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by description, ID, or currency..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as TransactionType)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Transactions</option>
                  <option value="sales">Share Sales</option>
                  <option value="vesting">Vesting Events</option>
                </select>
              </div>
            </div>

            {/* Second row: Date Range Filter */}
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {(dateFrom || dateTo) && (
                  <button
                    onClick={clearDateFilters}
                    className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Clear Dates
                  </button>
                )}
                {(filter !== 'all' || searchTerm || dateFrom || dateTo) && (
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {combinedTransactions.length === 0
                ? 'No transactions found. Import some data first.'
                : 'No transactions match your current filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      Date{' '}
                      {sortField === 'date' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('type')}
                    >
                      Type{' '}
                      {sortField === 'type' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shares
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('amount')}
                    >
                      Amount{' '}
                      {sortField === 'amount' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('currency')}
                    >
                      Currency{' '}
                      {sortField === 'currency' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.type === 'sale'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {transaction.type === 'sale' ? 'Sale' : 'Vesting'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.shares.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(
                          transaction.amount,
                          transaction.currency
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {filteredAndSortedTransactions.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredAndSortedTransactions.length} of{' '}
            {combinedTransactions.length} transactions
          </div>
        )}

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Transaction Details
                  </h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ID
                      </label>
                      <div className="text-sm text-gray-900">
                        {selectedTransaction.id}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type
                      </label>
                      <div className="text-sm text-gray-900 capitalize">
                        {selectedTransaction.type}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date
                      </label>
                      <div className="text-sm text-gray-900">
                        {formatDate(selectedTransaction.date)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Shares
                      </label>
                      <div className="text-sm text-gray-900">
                        {selectedTransaction.shares.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {selectedTransaction.type === 'sale' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Sale Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Sale Proceeds
                          </label>
                          <div className="text-gray-900">
                            {formatCurrency(
                              selectedTransaction.amount,
                              selectedTransaction.currency
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Price Per Share
                          </label>
                          <div className="text-gray-900">
                            {selectedTransaction.original &&
                            'salePricePerShare' in selectedTransaction.original
                              ? formatCurrency(
                                  selectedTransaction.original
                                    .salePricePerShare,
                                  selectedTransaction.currency
                                )
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTransaction.type === 'vesting' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Vesting Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Grant Date
                          </label>
                          <div className="text-gray-900">
                            {selectedTransaction.original &&
                            'grantDate' in selectedTransaction.original
                              ? formatDate(
                                  selectedTransaction.original.grantDate
                                )
                              : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Grant Type
                          </label>
                          <div className="text-gray-900">
                            {selectedTransaction.original &&
                            'grantType' in selectedTransaction.original
                              ? selectedTransaction.original.grantType
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

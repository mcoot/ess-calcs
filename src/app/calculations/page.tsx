'use client'

import { useState, useEffect, useMemo } from 'react'
import { loadImportedData } from '@/lib/storage'
import {
  calculateRsuVestingTaxableIncome,
  calculateCapitalGains,
  checkThirtyDayRule,
  type VestingEvent,
  type ShareSaleEvent,
  type TaxableIncomeResult,
  type CapitalGainsResult,
} from '@/lib/ess-calculations'
import type { ImportedData, ShareSaleRecord, RsuReleaseRecord } from '@/types'

interface PeriodSelection {
  startDate: string
  endDate: string
  label: string
}

interface CalculationResult {
  period: PeriodSelection
  vestingIncome: {
    total: number
    events: Array<{
      rsuRelease: RsuReleaseRecord
      calculation: TaxableIncomeResult
    }>
  }
  capitalGains: {
    total: number
    totalGains: number
    totalLosses: number
    events: Array<{
      sale: ShareSaleRecord
      calculation: CapitalGainsResult
      thirtyDayRule?: {
        applies: boolean
        vestingDate?: string
        daysBetween?: number
      }
    }>
  }
  summary: {
    totalTaxableIncome: number
    totalCapitalGains: number
    eligibleForDiscount: number
  }
}

// Australian financial year helper functions
function getCurrentFinancialYear(): PeriodSelection {
  const now = new Date()
  const currentYear = now.getFullYear()
  const isAfterJuly = now.getMonth() >= 6 // July is month 6 (0-indexed)

  const fyYear = isAfterJuly ? currentYear : currentYear - 1
  return {
    startDate: `${fyYear}-07-01`,
    endDate: `${fyYear + 1}-06-30`,
    label: `FY ${fyYear}-${(fyYear + 1).toString().slice(-2)}`,
  }
}

function getFinancialYearOptions(): PeriodSelection[] {
  const current = getCurrentFinancialYear()
  const currentFyYear = parseInt(current.startDate.split('-')[0])

  const options: PeriodSelection[] = []

  // Generate last 5 years and next 2 years
  for (let i = -5; i <= 2; i++) {
    const fyYear = currentFyYear + i
    options.push({
      startDate: `${fyYear}-07-01`,
      endDate: `${fyYear + 1}-06-30`,
      label: `FY ${fyYear}-${(fyYear + 1).toString().slice(-2)}`,
    })
  }

  return options.reverse()
}

export default function CalculationsPage() {
  const [data, setData] = useState<ImportedData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodSelection>(
    getCurrentFinancialYear()
  )
  const [useCustomPeriod, setUseCustomPeriod] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const financialYearOptions = getFinancialYearOptions()

  useEffect(() => {
    const importedData = loadImportedData()
    setData(importedData)
    setIsLoading(false)
  }, [])

  // Calculate effective period based on selection
  const effectivePeriod = useMemo((): PeriodSelection => {
    if (useCustomPeriod && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        label: `${customStartDate} to ${customEndDate}`,
      }
    }
    return selectedPeriod
  }, [useCustomPeriod, customStartDate, customEndDate, selectedPeriod])

  // Main calculation logic
  const calculationResults = useMemo((): CalculationResult | null => {
    if (!data || !effectivePeriod) return null

    const periodStart = new Date(effectivePeriod.startDate)
    const periodEnd = new Date(effectivePeriod.endDate)

    // Filter RSU release events in period
    const rsuReleasesInPeriod = (data.rsuReleases || []).filter((release) => {
      const releaseDate = new Date(release.releaseDate)
      return releaseDate >= periodStart && releaseDate <= periodEnd
    })

    // Filter sales in period (excluding those subject to 30-day rule)
    const salesInPeriod = data.sales.filter((sale) => {
      const saleDate = new Date(sale.saleDate)
      return saleDate >= periodStart && saleDate <= periodEnd
    })

    // Calculate vesting taxable income using RSU release data with related sales
    const vestingResults = rsuReleasesInPeriod
      .map((release) => {
        // Find all sales related to this RSU release
        const relatedSales = data.sales
          .filter(
            (sale) =>
              sale.originatingReleaseRef === release.releaseReferenceNumber
          )
          .map(
            (sale): ShareSaleEvent => ({
              saleDate: sale.saleDate,
              sharesSold: sale.sharesSold,
              salePricePerShare: sale.salePricePerShare,
              currency:
                sale.currency === 'USD' || sale.currency === 'AUD'
                  ? sale.currency
                  : 'AUD',
              brokerageCommission: sale.brokerageCommission,
              supplementalFees: sale.supplementalTransactionFee,
              acquisitionDate: release.releaseDate,
              // Note: Exchange rate would need to be added if we have that data available
            })
          )

        // Convert RSU release record to VestingEvent format
        const vestingEvent: VestingEvent = {
          vestDate: release.releaseDate,
          sharePrice: release.fairMarketValuePerShare,
          sharesVested: release.sharesVested,
          costBase: 0, // RSUs typically have $0 cost basis
          currency:
            release.currency === 'USD' || release.currency === 'AUD'
              ? release.currency
              : 'AUD',
          // Note: Exchange rate would need to be added if we have that data available for USD releases
        }

        try {
          const calculation = calculateRsuVestingTaxableIncome(
            vestingEvent,
            relatedSales.length > 0 ? relatedSales : undefined
          )
          return {
            rsuRelease: release,
            calculation,
          }
        } catch {
          // Error calculating vesting income - skip this record
          return null
        }
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)

    // Get all sales that were already handled by 30-day rule in RSU vesting calculations
    const processedThirtyDayRuleSales = new Set<string>()
    vestingResults.forEach((result) => {
      result.calculation.saleEvents?.forEach((saleEvent) => {
        if (saleEvent.thirtyDayRule.applies) {
          // Create a unique key for the sale (we'll use saleDate and sharesSold as a simple key)
          const saleKey = `${saleEvent.saleEvent.saleDate}-${saleEvent.saleEvent.sharesSold}`
          processedThirtyDayRuleSales.add(saleKey)
        }
      })
    })

    // Calculate capital gains for sales that are NOT subject to 30-day rule
    const capitalGainsResults = salesInPeriod
      .filter((sale) => {
        // Filter out 30-day rule sales that were already handled in RSU vesting calculations
        const saleKey = `${sale.saleDate}-${sale.sharesSold}`
        const correspondingRelease = (data.rsuReleases || []).find(
          (release) =>
            release.releaseReferenceNumber === sale.originatingReleaseRef
        )

        if (correspondingRelease) {
          const rule = checkThirtyDayRule(
            correspondingRelease.releaseDate,
            sale.saleDate
          )
          return !rule.applies || !processedThirtyDayRuleSales.has(saleKey)
        }

        return true // Include sales without corresponding releases for now
      })
      .map((sale) => {
        try {
          // Find corresponding RSU release to determine actual cost basis
          const correspondingRelease = (data.rsuReleases || []).find(
            (release) =>
              release.releaseReferenceNumber === sale.originatingReleaseRef
          )

          // Standard CGT calculation (no 30-day rule applies)
          const saleEvent: ShareSaleEvent = {
            saleDate: sale.saleDate,
            sharesSold: sale.sharesSold,
            salePricePerShare: sale.salePricePerShare,
            currency: 'AUD', // Assuming AUD for now
            brokerageCommission: sale.brokerageCommission,
            supplementalFees: sale.supplementalTransactionFee,
            acquisitionDate:
              correspondingRelease?.releaseDate || sale.originalAcquisitionDate,
          }

          // Use FMV at vesting as cost basis if we have RSU release data
          const costBasis = correspondingRelease
            ? correspondingRelease.fairMarketValuePerShare * sale.sharesSold
            : sale.originalCostBasisTotal

          const calculation = calculateCapitalGains(
            saleEvent,
            costBasis,
            correspondingRelease?.releaseDate || sale.originalAcquisitionDate
          )

          return {
            sale,
            calculation,
            thirtyDayRule: {
              applies: false,
              vestingDate:
                correspondingRelease?.releaseDate ||
                sale.originalAcquisitionDate,
              daysBetween: correspondingRelease
                ? checkThirtyDayRule(
                    correspondingRelease.releaseDate,
                    sale.saleDate
                  ).daysBetween
                : undefined,
            },
          }
        } catch {
          // Error calculating capital gains - skip this record
          return null
        }
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)

    // Calculate totals
    const totalVestingIncome = vestingResults.reduce(
      (sum, result) => sum + result.calculation.taxableIncome,
      0
    )

    const totalCapitalGains = capitalGainsResults.reduce(
      (sum, result) => sum + result.calculation.capitalGain,
      0
    )
    const totalGains = capitalGainsResults.reduce(
      (sum, result) =>
        result.calculation.capitalGain > 0
          ? sum + result.calculation.capitalGain
          : sum,
      0
    )
    const totalLosses = capitalGainsResults.reduce(
      (sum, result) =>
        result.calculation.capitalGain < 0
          ? sum + Math.abs(result.calculation.capitalGain)
          : sum,
      0
    )

    const eligibleForDiscount = capitalGainsResults.reduce(
      (sum, result) =>
        result.calculation.cgtDiscount.eligible
          ? sum + result.calculation.cgtDiscount.grossCapitalGain
          : sum,
      0
    )

    return {
      period: effectivePeriod,
      vestingIncome: {
        total: totalVestingIncome,
        events: vestingResults,
      },
      capitalGains: {
        total: totalCapitalGains,
        totalGains,
        totalLosses,
        events: capitalGainsResults,
      },
      summary: {
        totalTaxableIncome: totalVestingIncome,
        totalCapitalGains,
        eligibleForDiscount,
      },
    }
  }, [data, effectivePeriod])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU')
  }

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-gray-600">Loading calculations...</div>
        </div>
      </main>
    )
  }

  if (
    !data ||
    (data.sales.length === 0 &&
      data.vesting.length === 0 &&
      (!data.rsuReleases || data.rsuReleases.length === 0))
  ) {
    return (
      <main className="min-h-screen p-8 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Tax Calculations
          </h1>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-600">
              No transaction data available. Please import your sales and
              vesting data first.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Tax Calculations
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Calculate ESS income, capital gains/losses, and 30-day rule analysis
          for your selected period.
        </p>

        {/* Period Selection */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Calculation Period
          </h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={!useCustomPeriod}
                  onChange={() => setUseCustomPeriod(false)}
                  className="text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Financial Year
                </span>
              </label>

              {!useCustomPeriod && (
                <select
                  value={selectedPeriod.startDate}
                  onChange={(e) => {
                    const selected = financialYearOptions.find(
                      (option) => option.startDate === e.target.value
                    )
                    if (selected) setSelectedPeriod(selected)
                  }}
                  className="mt-2 block w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {financialYearOptions.map((option) => (
                    <option key={option.startDate} value={option.startDate}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={useCustomPeriod}
                  onChange={() => setUseCustomPeriod(true)}
                  className="text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Custom Period
                </span>
              </label>

              {useCustomPeriod && (
                <div className="mt-2 flex gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Selected Period:</strong> {effectivePeriod.label}
              <br />
              <span className="text-blue-600">
                {formatDate(effectivePeriod.startDate)} -{' '}
                {formatDate(effectivePeriod.endDate)}
              </span>
            </p>
          </div>
        </div>

        {/* Calculation Results */}
        {calculationResults && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    calculationResults.summary.totalTaxableIncome
                  )}
                </div>
                <div className="text-sm text-gray-600">ESS Taxable Income</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculationResults.summary.totalCapitalGains)}
                </div>
                <div className="text-sm text-gray-600">Net Capital Gains</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    calculationResults.summary.eligibleForDiscount
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  CGT Discount Eligible
                </div>
              </div>
            </div>

            {/* Vesting Income Details */}
            {calculationResults.vestingIncome.events.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    RSU Vesting Income (
                    {calculationResults.vestingIncome.events.length} events)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Taxable income from RSU release events (actual vestings) in
                    the selected period
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Release Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Shares
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sale Events
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remaining Shares
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Taxable Income
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {calculationResults.vestingIncome.events.map(
                        (result, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(result.rsuRelease.releaseDate)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {result.rsuRelease.grantName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.rsuRelease.sharesVested.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {result.calculation.saleEvents &&
                              result.calculation.saleEvents.length > 0 ? (
                                <div className="space-y-1">
                                  {result.calculation.saleEvents.map(
                                    (saleEvent, saleIndex) => (
                                      <div key={saleIndex} className="text-xs">
                                        <span className="font-medium">
                                          {formatDate(
                                            saleEvent.saleEvent.saleDate
                                          )}
                                          :
                                        </span>{' '}
                                        {saleEvent.saleEvent.sharesSold.toLocaleString()}{' '}
                                        shares
                                        {saleEvent.thirtyDayRule.applies && (
                                          <span className="ml-1 inline-flex px-1 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-800">
                                            30-day
                                          </span>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">
                                  No sales
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="font-medium">
                                {result.calculation.remainingShares.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              {formatCurrency(result.calculation.taxableIncome)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Capital Gains Details */}
            {calculationResults.capitalGains.events.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Capital Gains & Losses (
                    {calculationResults.capitalGains.events.length} events)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Capital gains and losses from share sales in the selected
                    period
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sale Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shares
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sale Proceeds
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost Base
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Capital Gain/Loss
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rule Applied
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {calculationResults.capitalGains.events.map(
                        (result, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(result.sale.saleDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.sale.sharesSold.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(result.calculation.saleProceeds)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(result.calculation.costBase)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span
                                className={
                                  result.calculation.isGain
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }
                              >
                                {formatCurrency(result.calculation.capitalGain)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  result.calculation.appliedRule === '30-day'
                                    ? 'bg-orange-100 text-orange-800'
                                    : result.calculation.cgtDiscount.eligible
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {result.calculation.appliedRule === '30-day'
                                  ? '30-Day Rule'
                                  : result.calculation.cgtDiscount.eligible
                                    ? 'CGT Discount'
                                    : 'Standard CGT'}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

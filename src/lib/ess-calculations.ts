/**
 * Australian Tax Office (ATO) Employee Share Scheme (ESS) calculations
 *
 * This module provides core business logic for calculating:
 * - Taxable income from RSU vesting
 * - Currency conversion (USD to AUD) for share events
 * - Capital gains and losses with 30-day rule consideration
 *
 * Based on ATO ESS tax rules and regulations.
 */

export interface VestingEvent {
  vestDate: string
  sharePrice: number
  sharesVested: number
  costBase?: number // Amount paid for shares (typically $0 for RSUs)
  currency: 'USD' | 'AUD'
  exchangeRate?: number // USD/AUD rate on vest date (required if currency is USD)
}

export interface CurrencyConversionResult {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  convertedCurrency: string
  exchangeRate: number
  conversionDate: string
}

export interface TaxableIncomeResult {
  taxableIncome: number
  currency: string
  calculation: {
    marketValue: number
    costBase: number
    sharesVested: number
    sharePrice: number
  }
  saleEvents?: Array<{
    saleEvent: ShareSaleEvent
    thirtyDayRule: ThirtyDayRuleResult
    adjustedTaxableIncome: number
  }>
  remainingShares: number
}

export interface ShareSaleEvent {
  saleDate: string
  sharesSold: number
  salePricePerShare: number
  currency: 'USD' | 'AUD'
  exchangeRate?: number // Required for USD sales
  brokerageCommission?: number
  supplementalFees?: number
  acquisitionDate?: string // Required for CGT discount calculation
}

export interface CapitalGainsResult {
  capitalGain: number // Positive for gain, negative for loss
  isGain: boolean
  costBase: number
  saleProceeds: number
  netProceeds: number // Sale proceeds minus fees
  currency: string
  appliedRule: '30-day' | 'standard-cgt' | 'none'
  cgtDiscount: {
    eligible: boolean
    holdingPeriodDays: number
    discountRate: number
    grossCapitalGain: number
    discountedCapitalGain: number
  }
  calculation: {
    grossProceeds: number
    totalFees: number
    costBase: number
    sharesSold: number
    salePricePerShare: number
  }
}

export interface ThirtyDayRuleResult {
  applies: boolean
  daysBetween: number
  vestingDate: string
  saleDate: string
  reason: string
}

export interface CombinedTaxResult {
  taxableIncome: number
  capitalGain: number
  thirtyDayRuleApplied: boolean
  currency: string
  vestingResult: TaxableIncomeResult | null
  saleResult: CapitalGainsResult
}

/**
 * Calculates taxable income from RSU vesting, with optional sale events for 30-day rule analysis
 * Formula: Taxable Income = Market Value of Shares at Vesting - Cost Base
 * Where: Market Value = Share Price × Number of Shares Vested
 *
 * If sale events are provided, applies the 30-day rule where applicable:
 * - Sales within 30 days: taxable income is based on sale proceeds instead of vesting value
 * - Sales after 30 days: separate vesting income and capital gains
 */
export function calculateRsuVestingTaxableIncome(
  event: VestingEvent,
  saleEvents?: ShareSaleEvent[]
): TaxableIncomeResult {
  const {
    sharePrice,
    sharesVested,
    costBase = 0,
    currency,
    exchangeRate,
  } = event

  // Validate USD conversion requirements
  if (currency === 'USD' && !exchangeRate) {
    throw new Error('Exchange rate required for USD currency conversion')
  }

  // Calculate market value in original currency
  const marketValue = sharePrice * sharesVested

  // Calculate taxable income in original currency
  const taxableIncomeOriginal = marketValue - costBase

  // Convert to AUD if needed
  let taxableIncome: number
  let resultCurrency: string

  if (currency === 'USD' && exchangeRate) {
    // Convert USD to AUD: AUD Value = USD Value ÷ Exchange Rate
    taxableIncome = taxableIncomeOriginal / exchangeRate
    resultCurrency = 'AUD'
  } else {
    taxableIncome = taxableIncomeOriginal
    resultCurrency = currency
  }

  // Process any related sale events if provided
  let adjustedTaxableIncome = taxableIncome
  const processedSaleEvents: Array<{
    saleEvent: ShareSaleEvent
    thirtyDayRule: ThirtyDayRuleResult
    adjustedTaxableIncome: number
  }> = []
  let totalSharesSold = 0

  if (saleEvents && saleEvents.length > 0) {
    // Sort sales by date to process chronologically
    const sortedSales = [...saleEvents].sort(
      (a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
    )

    for (const saleEvent of sortedSales) {
      // Check if shares being sold exceed remaining shares
      if (totalSharesSold + saleEvent.sharesSold > sharesVested) {
        throw new Error(
          `Cannot sell more shares (${totalSharesSold + saleEvent.sharesSold}) than were vested (${sharesVested})`
        )
      }

      // Check 30-day rule
      const thirtyDayRule = checkThirtyDayRule(
        event.vestDate,
        saleEvent.saleDate
      )

      let saleAdjustedIncome = 0

      if (thirtyDayRule.applies) {
        // 30-day rule: Sale date becomes taxing point, taxable income based on sale proceeds
        // Convert sale proceeds to AUD if needed
        let saleProceedsAud: number
        let totalFeesAud: number

        const brokerageCommission = saleEvent.brokerageCommission || 0
        const supplementalFees = saleEvent.supplementalFees || 0

        if (saleEvent.currency === 'USD' && saleEvent.exchangeRate) {
          const grossProceeds =
            saleEvent.sharesSold * saleEvent.salePricePerShare
          const totalFees = brokerageCommission + supplementalFees
          saleProceedsAud =
            Math.round((grossProceeds / saleEvent.exchangeRate) * 100) / 100
          totalFeesAud =
            Math.round((totalFees / saleEvent.exchangeRate) * 100) / 100
        } else if (saleEvent.currency === 'AUD') {
          saleProceedsAud = saleEvent.sharesSold * saleEvent.salePricePerShare
          totalFeesAud = brokerageCommission + supplementalFees
        } else {
          throw new Error(
            'Exchange rate required for USD sales in 30-day rule calculation'
          )
        }

        const costBaseForSoldShares =
          costBase * (saleEvent.sharesSold / sharesVested)
        saleAdjustedIncome =
          saleProceedsAud - costBaseForSoldShares - totalFeesAud

        // Adjust total taxable income by removing normal vesting income and adding 30-day rule income
        // Need to work in the result currency (AUD)
        const vestingIncomeForSoldSharesAud =
          taxableIncome * (saleEvent.sharesSold / sharesVested)
        adjustedTaxableIncome =
          adjustedTaxableIncome -
          vestingIncomeForSoldSharesAud +
          saleAdjustedIncome
      }

      processedSaleEvents.push({
        saleEvent,
        thirtyDayRule,
        adjustedTaxableIncome: saleAdjustedIncome,
      })

      totalSharesSold += saleEvent.sharesSold
    }
  }

  const remainingShares = sharesVested - totalSharesSold

  return {
    taxableIncome: adjustedTaxableIncome,
    currency: resultCurrency,
    calculation: {
      marketValue: marketValue,
      costBase: costBase,
      sharesVested: sharesVested,
      sharePrice: sharePrice,
    },
    saleEvents:
      processedSaleEvents.length > 0 ? processedSaleEvents : undefined,
    remainingShares,
  }
}

/**
 * Converts USD amount to AUD using provided exchange rate
 * Formula: AUD Value = USD Value ÷ Exchange Rate
 *
 * @param usdAmount - Amount in USD
 * @param exchangeRate - USD/AUD exchange rate (AUD per USD)
 * @param conversionDate - Date of conversion (ISO string)
 */
export function convertUsdToAud(
  usdAmount: number,
  exchangeRate: number,
  conversionDate: string
): CurrencyConversionResult {
  // Validate inputs
  if (usdAmount < 0) {
    throw new Error('Amount must be non-negative')
  }

  if (exchangeRate <= 0) {
    throw new Error('Exchange rate must be greater than 0')
  }

  // Convert USD to AUD: AUD Value = USD Value ÷ Exchange Rate
  const audAmount = usdAmount / exchangeRate

  // Round to 2 decimal places for consistent precision
  const convertedAmount = Math.round(audAmount * 100) / 100

  return {
    originalAmount: usdAmount,
    originalCurrency: 'USD',
    convertedAmount,
    convertedCurrency: 'AUD',
    exchangeRate: exchangeRate,
    conversionDate: conversionDate,
  }
}

/**
 * Converts share price per event (handles currency conversion if needed)
 */
export function convertShareEventValue(
  sharePrice: number,
  quantity: number,
  sourceCurrency: 'USD' | 'AUD',
  targetCurrency: 'USD' | 'AUD',
  exchangeRate?: number,
  conversionDate?: string
): CurrencyConversionResult {
  // Calculate total value in source currency
  const originalAmount = sharePrice * quantity

  // Handle same-currency case (no conversion needed)
  if (sourceCurrency === targetCurrency) {
    return {
      originalAmount,
      originalCurrency: sourceCurrency,
      convertedAmount: originalAmount,
      convertedCurrency: targetCurrency,
      exchangeRate: 1,
      conversionDate: conversionDate || new Date().toISOString().split('T')[0],
    }
  }

  // Handle currency conversion case
  if (!exchangeRate) {
    throw new Error('Exchange rate required for currency conversion')
  }

  if (!conversionDate) {
    throw new Error('Conversion date required for currency conversion')
  }

  // For now, only handle USD to AUD conversion
  if (sourceCurrency === 'USD' && targetCurrency === 'AUD') {
    return convertUsdToAud(originalAmount, exchangeRate, conversionDate)
  }

  throw new Error(
    `Conversion from ${sourceCurrency} to ${targetCurrency} not supported`
  )
}

/**
 * Calculates CGT discount for long-term holdings
 * Rule: 50% discount applies if held for more than 12 months (365 days)
 */
export function calculateCgtDiscount(
  acquisitionDate: string,
  saleDate: string,
  grossCapitalGain: number
): {
  eligible: boolean
  holdingPeriodDays: number
  discountRate: number
  grossCapitalGain: number
  discountedCapitalGain: number
} {
  const acquisitionDateTime = new Date(acquisitionDate)
  const saleDateTime = new Date(saleDate)

  // Validate date order
  if (saleDateTime < acquisitionDateTime) {
    throw new Error('Sale date cannot be before acquisition date')
  }

  // Calculate holding period in days
  const timeDifference = saleDateTime.getTime() - acquisitionDateTime.getTime()
  const holdingPeriodDays = Math.floor(timeDifference / (1000 * 3600 * 24))

  // CGT discount applies if held for more than 365 days (12 months)
  const eligible = holdingPeriodDays > 365

  // Only apply discount to capital gains (not losses)
  const discountRate = eligible && grossCapitalGain > 0 ? 0.5 : 0
  const discountedCapitalGain = grossCapitalGain * (1 - discountRate)

  return {
    eligible,
    holdingPeriodDays,
    discountRate,
    grossCapitalGain,
    discountedCapitalGain: Math.round(discountedCapitalGain * 100) / 100,
  }
}

/**
 * Determines if the 30-day rule applies to a share sale
 * Rule: If shares are sold within 30 days of vesting, the sale date becomes the taxing point
 */
export function checkThirtyDayRule(
  vestingDate: string,
  saleDate: string
): ThirtyDayRuleResult {
  const vestDate = new Date(vestingDate)
  const saleDateTime = new Date(saleDate)

  // Validate date order
  if (saleDateTime < vestDate) {
    throw new Error('Sale date cannot be before vesting date')
  }

  // Calculate the difference in days
  const timeDifference = saleDateTime.getTime() - vestDate.getTime()
  const daysBetween = Math.floor(timeDifference / (1000 * 3600 * 24))

  const applies = daysBetween <= 30
  const reason = applies
    ? `Sale occurred within 30 days of vesting (${daysBetween} days)`
    : `Sale occurred after 30-day period (${daysBetween} days)`

  return {
    applies,
    daysBetween,
    vestingDate,
    saleDate,
    reason,
  }
}

/**
 * Calculates capital gains/losses from share sale
 * Formula: Capital Gain = Sale Proceeds - Cost Base - Fees
 *
 * @param saleEvent - Details of the share sale
 * @param costBase - Cost basis from vesting (market value at vest in AUD)
 * @param acquisitionDate - Date shares were acquired (for CGT discount calculation)
 */
export function calculateCapitalGains(
  saleEvent: ShareSaleEvent,
  costBase: number,
  acquisitionDate?: string
): CapitalGainsResult {
  const {
    sharesSold,
    salePricePerShare,
    currency,
    exchangeRate,
    brokerageCommission = 0,
    supplementalFees = 0,
  } = saleEvent

  // Validate USD sales have exchange rate
  if (currency === 'USD' && !exchangeRate) {
    throw new Error('Exchange rate required for USD sales')
  }

  // Calculate gross proceeds in original currency
  const grossProceeds = sharesSold * salePricePerShare
  const totalFees = brokerageCommission + supplementalFees

  // Convert to AUD if needed
  let saleProceedsAud: number
  let totalFeesAud: number

  if (currency === 'USD' && exchangeRate) {
    // Convert USD to AUD
    saleProceedsAud = Math.round((grossProceeds / exchangeRate) * 100) / 100
    totalFeesAud = Math.round((totalFees / exchangeRate) * 100) / 100
  } else {
    saleProceedsAud = grossProceeds
    totalFeesAud = totalFees
  }

  // Calculate net proceeds and capital gain
  const netProceeds = saleProceedsAud - totalFeesAud
  const grossCapitalGain = netProceeds - costBase

  // Calculate CGT discount if acquisition date provided
  let cgtDiscount: {
    eligible: boolean
    holdingPeriodDays: number
    discountRate: number
    grossCapitalGain: number
    discountedCapitalGain: number
  }

  const effectiveAcquisitionDate = acquisitionDate || saleEvent.acquisitionDate

  if (effectiveAcquisitionDate) {
    cgtDiscount = calculateCgtDiscount(
      effectiveAcquisitionDate,
      saleEvent.saleDate,
      grossCapitalGain
    )
  } else {
    // No acquisition date provided, no discount applied
    cgtDiscount = {
      eligible: false,
      holdingPeriodDays: 0,
      discountRate: 0,
      grossCapitalGain,
      discountedCapitalGain: grossCapitalGain,
    }
  }

  const finalCapitalGain = cgtDiscount.discountedCapitalGain

  return {
    capitalGain: Math.round(finalCapitalGain * 100) / 100,
    isGain: finalCapitalGain > 0,
    costBase,
    saleProceeds: saleProceedsAud,
    netProceeds: Math.round(netProceeds * 100) / 100,
    currency: 'AUD',
    appliedRule: 'standard-cgt',
    cgtDiscount,
    calculation: {
      grossProceeds: currency === 'USD' ? grossProceeds : saleProceedsAud,
      totalFees: currency === 'USD' ? totalFees : totalFeesAud,
      costBase,
      sharesSold,
      salePricePerShare,
    },
  }
}

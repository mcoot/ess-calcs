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
}

/**
 * Calculates taxable income from RSU vesting
 * Formula: Taxable Income = Market Value of Shares at Vesting - Cost Base
 * Where: Market Value = Share Price × Number of Shares Vested
 */
export function calculateRsuVestingTaxableIncome(
  event: VestingEvent
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

  return {
    taxableIncome,
    currency: resultCurrency,
    calculation: {
      marketValue: marketValue,
      costBase: costBase,
      sharesVested: sharesVested,
      sharePrice: sharePrice,
    },
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

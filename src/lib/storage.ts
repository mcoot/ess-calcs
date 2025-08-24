/**
 * Local Storage utilities for ESS data persistence
 *
 * Handles saving and loading imported CSV data in browser localStorage
 * with data validation and error handling.
 */

import type { ImportedData, ShareSaleRecord, VestingRecord } from '@/types'

const STORAGE_KEYS = {
  IMPORTED_DATA: 'ess-calcs-imported-data',
  PREFERENCES: 'ess-calcs-preferences',
} as const

/**
 * Default empty data structure
 */
const defaultImportedData: ImportedData = {
  sales: [],
  vesting: [],
  lastUpdated: new Date().toISOString(),
}

/**
 * Safely access localStorage (handles SSR and disabled storage)
 */
function safeLocalStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/**
 * Loads imported data from localStorage
 */
export function loadImportedData(): ImportedData {
  const storage = safeLocalStorage()
  if (!storage) return defaultImportedData

  try {
    const stored = storage.getItem(STORAGE_KEYS.IMPORTED_DATA)
    if (!stored) return defaultImportedData

    const parsed = JSON.parse(stored) as ImportedData

    // Validate structure
    if (
      typeof parsed === 'object' &&
      Array.isArray(parsed.sales) &&
      Array.isArray(parsed.vesting) &&
      typeof parsed.lastUpdated === 'string'
    ) {
      return parsed
    }

    // eslint-disable-next-line no-console
    console.warn('Invalid data structure in localStorage, using defaults')
    return defaultImportedData
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading imported data:', error)
    return defaultImportedData
  }
}

/**
 * Saves imported data to localStorage
 */
export function saveImportedData(data: ImportedData): boolean {
  const storage = safeLocalStorage()
  if (!storage) {
    // eslint-disable-next-line no-console
    console.warn('localStorage not available')
    return false
  }

  try {
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString(),
    }

    storage.setItem(STORAGE_KEYS.IMPORTED_DATA, JSON.stringify(dataToSave))
    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error saving imported data:', error)
    return false
  }
}

/**
 * Adds new sales records to existing data
 */
export function addSalesRecords(newRecords: ShareSaleRecord[]): boolean {
  const currentData = loadImportedData()

  // Remove duplicates based on withdrawal reference
  const existingRefs = new Set(
    currentData.sales.map((record) => record.withdrawalRef)
  )
  const uniqueNewRecords = newRecords.filter(
    (record) => !existingRefs.has(record.withdrawalRef)
  )

  const updatedData: ImportedData = {
    ...currentData,
    sales: [...currentData.sales, ...uniqueNewRecords],
  }

  return saveImportedData(updatedData)
}

/**
 * Adds new vesting records to existing data
 */
export function addVestingRecords(newRecords: VestingRecord[]): boolean {
  const currentData = loadImportedData()

  // Remove duplicates based on grant number + vest date
  const existingKeys = new Set(
    currentData.vesting.map(
      (record) => `${record.grantNumber}-${record.vestDate}`
    )
  )
  const uniqueNewRecords = newRecords.filter(
    (record) => !existingKeys.has(`${record.grantNumber}-${record.vestDate}`)
  )

  const updatedData: ImportedData = {
    ...currentData,
    vesting: [...currentData.vesting, ...uniqueNewRecords],
  }

  return saveImportedData(updatedData)
}

/**
 * Replaces all sales data
 */
export function replaceSalesData(records: ShareSaleRecord[]): boolean {
  const currentData = loadImportedData()
  const updatedData: ImportedData = {
    ...currentData,
    sales: records,
  }

  return saveImportedData(updatedData)
}

/**
 * Replaces all vesting data
 */
export function replaceVestingData(records: VestingRecord[]): boolean {
  const currentData = loadImportedData()
  const updatedData: ImportedData = {
    ...currentData,
    vesting: records,
  }

  return saveImportedData(updatedData)
}

/**
 * Clears all imported data
 */
export function clearImportedData(): boolean {
  const storage = safeLocalStorage()
  if (!storage) return false

  try {
    storage.removeItem(STORAGE_KEYS.IMPORTED_DATA)
    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error clearing imported data:', error)
    return false
  }
}

/**
 * Gets data summary statistics
 */
export function getDataSummary(): {
  salesCount: number
  vestingCount: number
  lastUpdated: string | null
  totalSharesSold: number
  totalSalesProceeds: number
  totalSharesVested: number
} {
  const data = loadImportedData()

  const totalSharesSold = data.sales.reduce(
    (sum, record) => sum + record.sharesSold,
    0
  )
  const totalSalesProceeds = data.sales.reduce(
    (sum, record) => sum + record.saleProceeds,
    0
  )
  const totalSharesVested = data.vesting.reduce(
    (sum, record) => sum + record.shares,
    0
  )

  return {
    salesCount: data.sales.length,
    vestingCount: data.vesting.length,
    lastUpdated: data.lastUpdated,
    totalSharesSold,
    totalSalesProceeds,
    totalSharesVested,
  }
}

/**
 * Exports data as downloadable JSON
 */
export function exportDataAsJson(): string {
  const data = loadImportedData()
  return JSON.stringify(data, null, 2)
}

/**
 * Estimates localStorage usage in bytes
 */
export function getStorageUsage(): number {
  const data = loadImportedData()
  return JSON.stringify(data).length
}

export interface ShareSaleRecord {
  id: string
  periodStartDate?: string
  periodEndDate?: string
  withdrawalRef: string
  originatingReleaseRef: string
  employeeGrantNumber: string
  grantName: string
  lotNumber: string
  saleType: string
  saleDate: string
  originalAcquisitionDate: string
  soldWithin30Days: boolean
  originalCostBasisPerShare: number
  originalCostBasisTotal: number
  sharesSold: number
  saleProceeds: number
  salePricePerShare: number
  brokerageCommission: number
  supplementalTransactionFee: number
  currency: string
}

export interface VestingRecord {
  id: string
  asOfDate?: string
  grantDate: string
  grantNumber: string
  grantType: string
  grantName: string
  grantReason: string
  vestDate: string
  shares: number
}

export interface RsuReleaseRecord {
  id: string
  periodStartDate?: string
  periodEndDate?: string
  grantDate: string
  grantNumber: string
  grantType: string
  grantName: string
  grantReason: string
  releaseDate: string
  sharesVested: number
  sharesSoldToCover: number
  sharesHeld: number
  totalValue: number
  fairMarketValuePerShare: number
  saleDate?: string // For sell-to-cover only
  salePricePerShare?: number
  saleProceeds?: number
  sellToCoverAmount: number
  releaseReferenceNumber: string
  currency: string
}

export interface CapitalGainsResult {
  gain: number
  isGain: boolean
  taxableAmount: number
}

export interface ESSDiscountResult {
  discountApplies: boolean
  discountAmount: number
  taxableIncome: number
}

export interface CurrencyConversion {
  fromCurrency: string
  toCurrency: string
  rate: number
  date: string
  amount: number
  convertedAmount: number
}

export interface ImportedData {
  sales: ShareSaleRecord[]
  vesting: VestingRecord[]
  rsuReleases: RsuReleaseRecord[]
  lastUpdated: string
}

export interface CsvParseResult<T> {
  data: T[]
  errors: string[]
  warnings: string[]
  skippedRows: number
}

export type CsvFileType = 'sales' | 'vesting' | 'rsu-releases' | 'unknown'

export interface CsvParseOptions {
  skipEmptyRows: boolean
  trimWhitespace: boolean
  validateData: boolean
}

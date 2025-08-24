export interface ShareTransaction {
  id: string
  withdrawalRef: string
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

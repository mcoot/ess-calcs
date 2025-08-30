/**
 * CSV Parser for ESS data
 *
 * Handles parsing of share sales and vesting schedule CSV files
 * with comprehensive validation and error handling.
 */

import type {
  ShareSaleRecord,
  VestingRecord,
  CsvParseResult,
  CsvFileType,
  CsvParseOptions,
} from '@/types'

const DEFAULT_PARSE_OPTIONS: CsvParseOptions = {
  skipEmptyRows: true,
  trimWhitespace: true,
  validateData: true,
}

/**
 * Detects CSV file type based on headers
 */
export function detectCsvType(headers: string[]): CsvFileType {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

  // Check for sales CSV headers
  const salesMarkers = [
    'withdrawal reference number',
    'sale date',
    'shares sold',
    'sale proceeds',
    'brokerage commission',
  ]

  const vestingMarkers = ['grant date', 'grant number', 'vest date', 'shares']

  const salesMatches = salesMarkers.filter((marker) =>
    normalizedHeaders.some((header) => header.includes(marker))
  ).length

  const vestingMatches = vestingMarkers.filter((marker) =>
    normalizedHeaders.some((header) => header.includes(marker))
  ).length

  if (salesMatches >= 3) return 'sales'
  if (vestingMatches >= 3) return 'vesting'
  return 'unknown'
}

/**
 * Parses CSV text into array of string arrays
 */
export function parseCsvText(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/)
  const result: string[][] = []

  for (const line of lines) {
    if (line.trim() === '') continue

    // Simple CSV parsing - handles quoted fields and commas
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }

    // Add the last field
    fields.push(current.trim())
    result.push(fields)
  }

  return result
}

/**
 * Cleans and normalizes monetary values
 */
function parseMonetaryValue(value: string): number {
  if (!value || value.trim() === '') return 0

  // Remove currency symbols, commas, quotes, and whitespace
  const cleaned = value
    .replace(/["']/g, '')
    .replace(/[$,AUD\s]/g, '')
    .trim()

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Parses date from various formats
 */
function parseDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return ''

  const cleaned = dateStr.trim()

  // Try to parse DD-MMM-YYYY format (e.g., "08-Aug-2024")
  const ddMmmYyyy = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/
  const match = cleaned.match(ddMmmYyyy)

  if (match) {
    const [, day, month, year] = match
    const monthMap: Record<string, string> = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12',
    }

    const monthNum = monthMap[month.toLowerCase()]
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`
    }
  }

  // Try ISO format or other standard formats
  const date = new Date(cleaned)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return cleaned // Return as-is if parsing fails
}

/**
 * Parses share sales CSV data
 */
export function parseShareSalesCsv(
  csvText: string,
  options: Partial<CsvParseOptions> = {}
): CsvParseResult<ShareSaleRecord> {
  const opts = { ...DEFAULT_PARSE_OPTIONS, ...options }
  const rows = parseCsvText(csvText)

  const result: CsvParseResult<ShareSaleRecord> = {
    data: [],
    errors: [],
    warnings: [],
    skippedRows: 0,
  }

  if (rows.length === 0) {
    result.errors.push('CSV file is empty')
    return result
  }

  // Find the header row (skip title rows)
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    if (
      row.some((cell) => cell.toLowerCase().includes('withdrawal reference'))
    ) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    result.errors.push('Could not find sales data headers')
    return result
  }

  const headers = rows[headerRowIndex]

  // Map header indices
  const getHeaderIndex = (searchTerms: string[]) => {
    for (const term of searchTerms) {
      const index = headers.findIndex((h) =>
        h.toLowerCase().includes(term.toLowerCase())
      )
      if (index !== -1) return index
    }
    return -1
  }

  // Custom function to find the exact "Original Cost Basis" column (not per share)
  const getOriginalCostBasisTotalIndex = () => {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim()
      // Match exact "original cost basis" but not "original cost basis per share"
      if (header === 'original cost basis') {
        return i
      }
    }
    return -1
  }

  const indices = {
    periodStartDate: getHeaderIndex(['period start date']),
    periodEndDate: getHeaderIndex(['period end date']),
    withdrawalRef: getHeaderIndex(['withdrawal reference']),
    originatingReleaseRef: getHeaderIndex(['originating release']),
    employeeGrantNumber: getHeaderIndex(['employee grant number']),
    grantName: getHeaderIndex(['grant name']),
    lotNumber: getHeaderIndex(['lot number']),
    saleType: getHeaderIndex(['sale type']),
    saleDate: getHeaderIndex(['sale date']),
    originalAcquisitionDate: getHeaderIndex(['original acquisition date']),
    soldWithin30Days: getHeaderIndex(['sold within 30 days']),
    originalCostBasisPerShare: getHeaderIndex([
      'original cost basis per share',
    ]),
    originalCostBasisTotal: getOriginalCostBasisTotalIndex(),
    sharesSold: getHeaderIndex(['shares sold']),
    saleProceeds: getHeaderIndex(['sale proceeds']),
    salePricePerShare: getHeaderIndex(['sale price per share']),
    brokerageCommission: getHeaderIndex(['brokerage commission']),
    supplementalTransactionFee: getHeaderIndex([
      'supplemental transaction fee',
    ]),
  }

  // Validate required fields
  const requiredFields = [
    'withdrawalRef',
    'saleDate',
    'sharesSold',
    'saleProceeds',
  ] as const

  for (const field of requiredFields) {
    if (indices[field] === -1) {
      result.errors.push(`Required column not found: ${field}`)
    }
  }

  if (result.errors.length > 0) {
    return result
  }

  // Parse data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty rows or summary rows
    if (
      opts.skipEmptyRows &&
      row.every((cell) => !cell || cell.trim() === '')
    ) {
      result.skippedRows++
      continue
    }

    // Skip rows that look like totals/summaries
    if (row[0] === '' && row[1] === '' && row[2] === '') {
      result.skippedRows++
      continue
    }

    try {
      const record: ShareSaleRecord = {
        id: `${row[indices.withdrawalRef]}-${i}`,
        periodStartDate: row[indices.periodStartDate] || '',
        periodEndDate: row[indices.periodEndDate] || '',
        withdrawalRef: row[indices.withdrawalRef] || '',
        originatingReleaseRef: row[indices.originatingReleaseRef] || '',
        employeeGrantNumber: row[indices.employeeGrantNumber] || '',
        grantName: row[indices.grantName] || '',
        lotNumber: row[indices.lotNumber] || '',
        saleType: row[indices.saleType] || '',
        saleDate: parseDate(row[indices.saleDate] || ''),
        originalAcquisitionDate: parseDate(
          row[indices.originalAcquisitionDate] || ''
        ),
        soldWithin30Days:
          (row[indices.soldWithin30Days] || '').toLowerCase() === 'yes',
        originalCostBasisPerShare: parseMonetaryValue(
          row[indices.originalCostBasisPerShare] || ''
        ),
        originalCostBasisTotal: parseMonetaryValue(
          row[indices.originalCostBasisTotal] || ''
        ),
        sharesSold: parseFloat(row[indices.sharesSold] || '0') || 0,
        saleProceeds: parseMonetaryValue(row[indices.saleProceeds] || ''),
        salePricePerShare: parseMonetaryValue(
          row[indices.salePricePerShare] || ''
        ),
        brokerageCommission: parseMonetaryValue(
          row[indices.brokerageCommission] || ''
        ),
        supplementalTransactionFee: parseMonetaryValue(
          row[indices.supplementalTransactionFee] || ''
        ),
        currency: 'AUD', // Default based on sample data
      }

      // Validate required data
      if (opts.validateData) {
        if (!record.withdrawalRef) {
          result.warnings.push(`Row ${i + 1}: Missing withdrawal reference`)
        }
        if (!record.saleDate) {
          result.warnings.push(`Row ${i + 1}: Missing or invalid sale date`)
        }
        if (record.sharesSold <= 0) {
          result.warnings.push(`Row ${i + 1}: Invalid shares sold quantity`)
        }
      }

      result.data.push(record)
    } catch (error) {
      result.errors.push(
        `Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`
      )
    }
  }

  return result
}

/**
 * Parses vesting schedule CSV data
 */
export function parseVestingScheduleCsv(
  csvText: string,
  options: Partial<CsvParseOptions> = {}
): CsvParseResult<VestingRecord> {
  const opts = { ...DEFAULT_PARSE_OPTIONS, ...options }
  const rows = parseCsvText(csvText)

  const result: CsvParseResult<VestingRecord> = {
    data: [],
    errors: [],
    warnings: [],
    skippedRows: 0,
  }

  if (rows.length === 0) {
    result.errors.push('CSV file is empty')
    return result
  }

  // Find the header row
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    if (row.some((cell) => cell.toLowerCase().includes('grant date'))) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    result.errors.push('Could not find vesting schedule headers')
    return result
  }

  const headers = rows[headerRowIndex]

  // Map header indices
  const getHeaderIndex = (searchTerms: string[]) => {
    for (const term of searchTerms) {
      const index = headers.findIndex((h) =>
        h.toLowerCase().includes(term.toLowerCase())
      )
      if (index !== -1) return index
    }
    return -1
  }

  const indices = {
    asOfDate: getHeaderIndex(['as of date']),
    grantDate: getHeaderIndex(['grant date']),
    grantNumber: getHeaderIndex(['grant number']),
    grantType: getHeaderIndex(['grant type']),
    grantName: getHeaderIndex(['grant name']),
    grantReason: getHeaderIndex(['grant reason']),
    vestDate: getHeaderIndex(['vest date']),
    shares: getHeaderIndex(['shares']),
  }

  // Parse data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty rows, header rows, or summary rows
    if (
      opts.skipEmptyRows &&
      row.every((cell) => !cell || cell.trim() === '')
    ) {
      result.skippedRows++
      continue
    }

    // Skip grant number header rows (e.g., "Grant Number: 9375")
    if (row[0] === '' && row[2]?.startsWith('Grant Number:')) {
      result.skippedRows++
      continue
    }

    // Skip total rows
    if (row[0] === '' && row[7] && !row[1] && !row[3]) {
      result.skippedRows++
      continue
    }

    try {
      // Extract grant number if available
      let grantNumber = row[indices.grantNumber] || ''
      if (!grantNumber && i > 0) {
        // Look backwards for grant number context
        for (let j = i - 1; j >= 0; j--) {
          const prevRow = rows[j]
          if (prevRow[2]?.startsWith('Grant Number:')) {
            grantNumber = prevRow[2].replace('Grant Number:', '').trim()
            break
          }
        }
      }

      const record: VestingRecord = {
        id: `${grantNumber}-${row[indices.vestDate]}-${i}`,
        asOfDate: row[indices.asOfDate] || '',
        grantDate: parseDate(row[indices.grantDate] || ''),
        grantNumber,
        grantType: row[indices.grantType] || '',
        grantName: row[indices.grantName] || '',
        grantReason: row[indices.grantReason] || '',
        vestDate: parseDate(row[indices.vestDate] || ''),
        shares:
          parseInt(row[indices.shares]?.replace(/,/g, '') || '0', 10) || 0,
      }

      // Validate required data
      if (opts.validateData) {
        if (!record.grantNumber) {
          result.warnings.push(`Row ${i + 1}: Missing grant number`)
        }
        if (!record.vestDate) {
          result.warnings.push(`Row ${i + 1}: Missing or invalid vest date`)
        }
        if (record.shares <= 0) {
          result.warnings.push(`Row ${i + 1}: Invalid share quantity`)
        }
      }

      // Only add records with valid essential data
      if (record.vestDate && record.shares > 0) {
        result.data.push(record)
      } else {
        result.skippedRows++
      }
    } catch (error) {
      result.errors.push(
        `Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`
      )
    }
  }

  return result
}

/**
 * Auto-detects CSV type and parses accordingly
 */
export function parseAnyCsv(
  csvText: string,
  options: Partial<CsvParseOptions> = {}
): {
  type: CsvFileType
  sales?: CsvParseResult<ShareSaleRecord>
  vesting?: CsvParseResult<VestingRecord>
} {
  const rows = parseCsvText(csvText)

  if (rows.length === 0) {
    return { type: 'unknown' }
  }

  // Get first few rows to detect headers
  const headerRows = rows.slice(0, 5).flat()
  const csvType = detectCsvType(headerRows)

  switch (csvType) {
    case 'sales':
      return {
        type: 'sales',
        sales: parseShareSalesCsv(csvText, options),
      }

    case 'vesting':
      return {
        type: 'vesting',
        vesting: parseVestingScheduleCsv(csvText, options),
      }

    default:
      return { type: 'unknown' }
  }
}

import {
  detectCsvType,
  parseCsvText,
  parseShareSalesCsv,
  parseVestingScheduleCsv,
  parseRsuReleasesCsv,
  parseAnyCsv,
} from '@/lib/csv-parser'

describe('CSV Parser', () => {
  describe('detectCsvType', () => {
    it('should detect sales CSV type', () => {
      const salesHeaders = [
        'Period Start Date',
        'Withdrawal Reference Number',
        'Sale Date',
        'Shares Sold',
        'Sale Proceeds',
        'Brokerage Commission',
      ]

      expect(detectCsvType(salesHeaders)).toBe('sales')
    })

    it('should detect vesting CSV type', () => {
      const vestingHeaders = [
        'Grant Date',
        'Grant Number',
        'Vest Date',
        'Shares',
        'Grant Type',
      ]

      expect(detectCsvType(vestingHeaders)).toBe('vesting')
    })

    it('should detect RSU release CSV type', () => {
      const rsuReleaseHeaders = [
        'Period Start Date',
        'Grant Date',
        'Release Date',
        'Shares Vested',
        'Fair Market Value Per Share',
        'Release Reference Number',
        'Sale Date (Sell-To-Cover only)', // This would trigger sales detection
        'Sale Proceeds', // This too
      ]

      expect(detectCsvType(rsuReleaseHeaders)).toBe('rsu-releases')
    })

    it('should prioritize RSU releases over sales when both match', () => {
      // Test with headers that could match both
      const ambiguousHeaders = [
        'Release Date', // RSU marker
        'Shares Vested', // RSU marker
        'Fair Market Value Per Share', // RSU marker
        'Release Reference Number', // RSU marker
        'Sale Date', // Sales marker
        'Sale Proceeds', // Sales marker
        'Sale Price Per Share', // Sales marker
      ]

      expect(detectCsvType(ambiguousHeaders)).toBe('rsu-releases')
    })

    it('should return unknown for unrecognized headers', () => {
      const unknownHeaders = ['Column A', 'Column B', 'Column C']
      expect(detectCsvType(unknownHeaders)).toBe('unknown')
    })
  })

  describe('parseCsvText', () => {
    it('should parse simple CSV text', () => {
      const csvText = 'Name,Age,City\nJohn,30,Sydney\nJane,25,Melbourne'
      const result = parseCsvText(csvText)

      expect(result).toEqual([
        ['Name', 'Age', 'City'],
        ['John', '30', 'Sydney'],
        ['Jane', '25', 'Melbourne'],
      ])
    })

    it('should handle quoted fields with commas', () => {
      const csvText =
        'Name,Description\nJohn,"Lives in Sydney, Australia"\nJane,"Works at ABC, Inc."'
      const result = parseCsvText(csvText)

      expect(result).toEqual([
        ['Name', 'Description'],
        ['John', 'Lives in Sydney, Australia'],
        ['Jane', 'Works at ABC, Inc.'],
      ])
    })

    it('should handle escaped quotes', () => {
      const csvText =
        'Name,Quote\nJohn,"He said ""Hello"""\nJane,"She replied ""Hi"""'
      const result = parseCsvText(csvText)

      expect(result).toEqual([
        ['Name', 'Quote'],
        ['John', 'He said "Hello"'],
        ['Jane', 'She replied "Hi"'],
      ])
    })

    it('should skip empty lines', () => {
      const csvText = 'Name,Age\n\nJohn,30\n\nJane,25\n'
      const result = parseCsvText(csvText)

      expect(result).toEqual([
        ['Name', 'Age'],
        ['John', '30'],
        ['Jane', '25'],
      ])
    })
  })

  describe('parseShareSalesCsv', () => {
    const sampleSalesCsv = `Sales - Long Shares
Period Start Date,Period End Date,Withdrawal Reference Number,Originating Release Reference Number,Employee Grant Number,Grant Name,Lot Number,Sale Type,Sale Date,Original Acquisition Date,Sold Within 30 Days of Vest,Original Cost Basis Per Share,,Original Cost Basis,,Shares Sold,Sale Proceeds,,Sale Price Per Share,,Brokerage Commission,,Supplemental Transaction Fee,
01-Jul-2024,30-Jun-2025,WRCBF99C6D9-1EE,RBBB4D9D02,68889,15 SEP 2023 RSU Grant,1,Long Shares,08-Aug-2024,13-May-2024,NO,$281.623537,AUD,"$7,040.59",AUD,25,"$5,352.74",AUD,$214.1097,AUD,$0.00,AUD,$0.36,AUD
01-Jul-2024,30-Jun-2025,WRCBFC022E6-1EE,RBBB4D9D02,68889,15 SEP 2023 RSU Grant,1,Long Shares,12-Aug-2024,13-May-2024,NO,$281.623537,AUD,"$7,040.59",AUD,25,"$5,460.57",AUD,$218.4227,AUD,$0.00,AUD,$0.36,AUD`

    it('should parse sales CSV successfully', () => {
      const result = parseShareSalesCsv(sampleSalesCsv)

      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(2)

      const firstRecord = result.data[0]
      expect(firstRecord.withdrawalRef).toBe('WRCBF99C6D9-1EE')
      expect(firstRecord.employeeGrantNumber).toBe('68889')
      expect(firstRecord.sharesSold).toBe(25)
      expect(firstRecord.saleProceeds).toBe(5352.74)
      expect(firstRecord.soldWithin30Days).toBe(false)
      expect(firstRecord.saleDate).toBe('2024-08-08')
    })

    it('should handle empty CSV', () => {
      const result = parseShareSalesCsv('')
      expect(result.errors).toContain('CSV file is empty')
      expect(result.data).toHaveLength(0)
    })

    it('should handle CSV without proper headers', () => {
      const badCsv = 'Column1,Column2\nValue1,Value2'
      const result = parseShareSalesCsv(badCsv)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('parseVestingScheduleCsv', () => {
    const sampleVestingCsv = `Full Vesting Schedule
As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Vest Date,Shares
Grant Number: 9375
30-Jun-2025,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-Feb-2019,118
30-Jun-2025,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-May-2019,30
30-Jun-2025,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-Aug-2019,30`

    it('should parse vesting CSV successfully', () => {
      const result = parseVestingScheduleCsv(sampleVestingCsv)

      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(3)

      const firstRecord = result.data[0]
      expect(firstRecord.grantNumber).toBe('9375')
      expect(firstRecord.shares).toBe(118)
      expect(firstRecord.vestDate).toBe('2019-02-18')
      expect(firstRecord.grantName).toBe('02.15.2018 RSU Grant (New Hire)')
    })

    it('should handle grant number context', () => {
      const result = parseVestingScheduleCsv(sampleVestingCsv)

      // All records should have the grant number from the context
      result.data.forEach((record) => {
        expect(record.grantNumber).toBe('9375')
      })
    })
  })

  describe('parseRsuReleasesCsv', () => {
    const sampleRsuReleasesCsv = `RSU Releases
Period Start Date,Period End Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Release Date,Shares Vested,Shares Sold-To-Cover,Shares Held,Value,,Fair Market Value Per Share,,Sale Date (Sell-To-Cover only),Sale Price Per Share,,Sale Proceeds,,Sell-To-Cover Amount,,Release Reference Number
01-Jul-2024,30-Jun-2025,15-Sep-2022,54539,Share Units (RSU),15 SEP 2022 RSU Grant (One Cycle),Ongoing,13-Aug-2024,35,0,35,"$7,720.27",AUD,$220.579174,AUD,,,,,,$0.00,AUD,RBBFDB5AE1
01-Jul-2024,30-Jun-2025,15-Sep-2023,68889,Share Units (RSU),15 SEP 2023 RSU Grant,Ongoing,13-Aug-2024,59,0,59,"$13,014.17",AUD,$220.579174,AUD,,,,,,$0.00,AUD,RBBFDB5AB9`

    it('should parse RSU releases CSV successfully', () => {
      const result = parseRsuReleasesCsv(sampleRsuReleasesCsv)

      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(2)
      expect(result.skippedRows).toBe(0)

      const firstRecord = result.data[0]
      expect(firstRecord.grantNumber).toBe('54539')
      expect(firstRecord.releaseDate).toBe('2024-08-13') // Date parser normalizes format
      expect(firstRecord.sharesVested).toBe(35)
      expect(firstRecord.totalValue).toBe(7720.27)
      expect(firstRecord.fairMarketValuePerShare).toBe(220.579174)
      expect(firstRecord.releaseReferenceNumber).toBe('RBBFDB5AE1')
    })

    it('should handle RSU release CSV with missing data', () => {
      const badRsuCsv = `Release Date,Shares Vested,Fair Market Value Per Share,Release Reference Number
,invalid,not-a-number,ref`

      const result = parseRsuReleasesCsv(badRsuCsv)
      expect(result.data).toHaveLength(0) // Invalid data should be skipped
      expect(result.skippedRows).toBe(1)
    })
  })

  describe('parseAnyCsv', () => {
    it('should auto-detect and parse sales CSV', () => {
      const salesCsv = `Withdrawal Reference Number,Sale Date,Shares Sold,Sale Proceeds
WRC123,08-Aug-2024,25,5000`

      const result = parseAnyCsv(salesCsv)
      expect(result.type).toBe('sales')
      expect(result.sales?.data).toHaveLength(1)
    })

    it('should auto-detect and parse vesting CSV', () => {
      const vestingCsv = `Grant Date,Grant Number,Vest Date,Shares
15-Feb-2018,9375,18-Feb-2019,118`

      const result = parseAnyCsv(vestingCsv)
      expect(result.type).toBe('vesting')
      expect(result.vesting?.data).toHaveLength(1)
    })

    it('should auto-detect and parse RSU releases CSV', () => {
      const rsuReleasesCsv = `Release Date,Shares Vested,Fair Market Value Per Share,Release Reference Number,Sale Date,Sale Proceeds
13-Aug-2024,35,220.579174,RBBFDB5AE1,,`

      const result = parseAnyCsv(rsuReleasesCsv)
      expect(result.type).toBe('rsu-releases')
      expect(result.rsuReleases?.data).toHaveLength(1)
    })

    it('should return unknown for unrecognizable CSV', () => {
      const unknownCsv = `Random Column,Another Column
Value1,Value2`

      const result = parseAnyCsv(unknownCsv)
      expect(result.type).toBe('unknown')
    })

    it('should handle empty CSV', () => {
      const result = parseAnyCsv('')
      expect(result.type).toBe('unknown')
    })
  })

  describe('Date Parsing', () => {
    it('should parse DD-MMM-YYYY dates correctly', () => {
      const csvWithDates = `Grant Date,Vest Date,Shares
15-Feb-2018,18-Aug-2019,30`

      const result = parseVestingScheduleCsv(csvWithDates)
      expect(result.data[0].grantDate).toBe('2018-02-15')
      expect(result.data[0].vestDate).toBe('2019-08-18')
    })
  })

  describe('Monetary Value Parsing', () => {
    it('should parse monetary values with currency symbols and commas', () => {
      const csvWithMoney = `Withdrawal Reference Number,Sale Date,Shares Sold,Sale Proceeds,Brokerage Commission
WRC123,08-Aug-2024,25,"$5,352.74",$10.50`

      const result = parseShareSalesCsv(csvWithMoney)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].saleProceeds).toBe(5352.74)
      expect(result.data[0].brokerageCommission).toBe(10.5)
    })
  })

  describe('Boolean Parsing', () => {
    it('should parse YES/NO values to boolean', () => {
      const csvWithBooleans = `Withdrawal Reference Number,Sale Date,Shares Sold,Sale Proceeds,Sold Within 30 Days of Vest
WRC123,08-Aug-2024,25,5000,YES
WRC124,09-Aug-2024,30,6000,NO`

      const result = parseShareSalesCsv(csvWithBooleans)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].soldWithin30Days).toBe(true)
      expect(result.data[1].soldWithin30Days).toBe(false)
    })
  })
})

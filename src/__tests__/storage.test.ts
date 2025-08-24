/**
 * @jest-environment jsdom
 */

import {
  loadImportedData,
  saveImportedData,
  addSalesRecords,
  addVestingRecords,
  replaceSalesData,
  replaceVestingData,
  clearImportedData,
  getDataSummary,
  exportDataAsJson,
  getStorageUsage,
} from '@/lib/storage'
import type { ShareSaleRecord, VestingRecord } from '@/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadImportedData', () => {
    it('should return default data when localStorage is empty', () => {
      const data = loadImportedData()

      expect(data.sales).toEqual([])
      expect(data.vesting).toEqual([])
      expect(data.lastUpdated).toBeDefined()
    })

    it('should load existing data from localStorage', () => {
      const testData = {
        sales: [{ id: '1', withdrawalRef: 'WRC123' } as ShareSaleRecord],
        vesting: [{ id: '1', grantNumber: '9375' } as VestingRecord],
        lastUpdated: '2024-01-01T00:00:00.000Z',
      }

      localStorage.setItem('ess-calcs-imported-data', JSON.stringify(testData))

      const data = loadImportedData()
      expect(data).toEqual(testData)
    })

    it('should return default data when stored data is invalid', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      localStorage.setItem('ess-calcs-imported-data', 'invalid-json')

      const data = loadImportedData()
      expect(data.sales).toEqual([])
      expect(data.vesting).toEqual([])

      consoleSpy.mockRestore()
    })
  })

  describe('saveImportedData', () => {
    it('should save data to localStorage', () => {
      const testData = {
        sales: [{ id: '1', withdrawalRef: 'WRC123' } as ShareSaleRecord],
        vesting: [{ id: '1', grantNumber: '9375' } as VestingRecord],
        lastUpdated: '2024-01-01T00:00:00.000Z',
      }

      const success = saveImportedData(testData)
      expect(success).toBe(true)

      const stored = localStorage.getItem('ess-calcs-imported-data')
      expect(stored).toBeDefined()

      const parsed = JSON.parse(stored!)
      expect(parsed.sales).toEqual(testData.sales)
      expect(parsed.vesting).toEqual(testData.vesting)
      expect(parsed.lastUpdated).toBeDefined() // Should be updated to current time
    })
  })

  describe('addSalesRecords', () => {
    it('should add new sales records', () => {
      const newRecords: ShareSaleRecord[] = [
        {
          id: '1',
          withdrawalRef: 'WRC123',
          employeeGrantNumber: '68889',
          sharesSold: 25,
          saleProceeds: 5000,
        } as ShareSaleRecord,
      ]

      const success = addSalesRecords(newRecords)
      expect(success).toBe(true)

      const data = loadImportedData()
      expect(data.sales).toHaveLength(1)
      expect(data.sales[0].withdrawalRef).toBe('WRC123')
    })

    it('should not add duplicate sales records against existing data', () => {
      // Add initial record
      addSalesRecords([{ id: '1', withdrawalRef: 'WRC123' } as ShareSaleRecord])

      // Try to add duplicate
      addSalesRecords([{ id: '2', withdrawalRef: 'WRC123' } as ShareSaleRecord])

      const data = loadImportedData()
      expect(data.sales).toHaveLength(1) // Should still have only one
      expect(data.sales[0].id).toBe('1') // Original should remain
    })

    it('should merge with existing sales records', () => {
      // Add first batch
      addSalesRecords([{ id: '1', withdrawalRef: 'WRC123' } as ShareSaleRecord])

      // Add second batch
      addSalesRecords([{ id: '2', withdrawalRef: 'WRC124' } as ShareSaleRecord])

      const data = loadImportedData()
      expect(data.sales).toHaveLength(2)
    })
  })

  describe('addVestingRecords', () => {
    it('should add new vesting records', () => {
      const newRecords: VestingRecord[] = [
        {
          id: '1',
          grantNumber: '9375',
          vestDate: '2019-02-18',
          shares: 118,
        } as VestingRecord,
      ]

      const success = addVestingRecords(newRecords)
      expect(success).toBe(true)

      const data = loadImportedData()
      expect(data.vesting).toHaveLength(1)
      expect(data.vesting[0].grantNumber).toBe('9375')
    })

    it('should not add duplicate vesting records against existing data', () => {
      // Add initial record
      addVestingRecords([
        {
          id: '1',
          grantNumber: '9375',
          vestDate: '2019-02-18',
        } as VestingRecord,
      ])

      // Try to add duplicate
      addVestingRecords([
        {
          id: '2',
          grantNumber: '9375',
          vestDate: '2019-02-18',
        } as VestingRecord,
      ])

      const data = loadImportedData()
      expect(data.vesting).toHaveLength(1) // Should still have only one
      expect(data.vesting[0].id).toBe('1') // Original should remain
    })
  })

  describe('replaceSalesData', () => {
    it('should replace all sales data', () => {
      // Add initial data
      addSalesRecords([{ id: '1', withdrawalRef: 'WRC123' } as ShareSaleRecord])

      // Replace with new data
      const newData: ShareSaleRecord[] = [
        { id: '2', withdrawalRef: 'WRC124' } as ShareSaleRecord,
        { id: '3', withdrawalRef: 'WRC125' } as ShareSaleRecord,
      ]

      replaceSalesData(newData)

      const data = loadImportedData()
      expect(data.sales).toHaveLength(2)
      expect(
        data.sales.find((r) => r.withdrawalRef === 'WRC123')
      ).toBeUndefined()
      expect(data.sales.find((r) => r.withdrawalRef === 'WRC124')).toBeDefined()
    })
  })

  describe('replaceVestingData', () => {
    it('should replace all vesting data', () => {
      // Add initial data
      addVestingRecords([{ id: '1', grantNumber: '9375' } as VestingRecord])

      // Replace with new data
      const newData: VestingRecord[] = [
        { id: '2', grantNumber: '14333' } as VestingRecord,
      ]

      replaceVestingData(newData)

      const data = loadImportedData()
      expect(data.vesting).toHaveLength(1)
      expect(data.vesting[0].grantNumber).toBe('14333')
    })
  })

  describe('clearImportedData', () => {
    it('should clear all data', () => {
      // Add some data first
      addSalesRecords([{ id: '1', withdrawalRef: 'WRC123' } as ShareSaleRecord])
      addVestingRecords([{ id: '1', grantNumber: '9375' } as VestingRecord])

      const success = clearImportedData()
      expect(success).toBe(true)

      const data = loadImportedData()
      expect(data.sales).toHaveLength(0)
      expect(data.vesting).toHaveLength(0)
    })
  })

  describe('getDataSummary', () => {
    it('should calculate correct summary statistics', () => {
      const salesData: ShareSaleRecord[] = [
        { id: '1', sharesSold: 25, saleProceeds: 5000 } as ShareSaleRecord,
        { id: '2', sharesSold: 50, saleProceeds: 10000 } as ShareSaleRecord,
      ]

      const vestingData: VestingRecord[] = [
        { id: '1', shares: 118 } as VestingRecord,
        { id: '2', shares: 30 } as VestingRecord,
      ]

      addSalesRecords(salesData)
      addVestingRecords(vestingData)

      const summary = getDataSummary()
      expect(summary.salesCount).toBe(2)
      expect(summary.vestingCount).toBe(2)
      expect(summary.totalSharesSold).toBe(75)
      expect(summary.totalSalesProceeds).toBe(15000)
      expect(summary.totalSharesVested).toBe(148)
    })
  })

  describe('exportDataAsJson', () => {
    it('should export data as JSON string', () => {
      const testData = {
        sales: [{ id: '1', withdrawalRef: 'WRC123' }] as ShareSaleRecord[],
        vesting: [{ id: '1', grantNumber: '9375' }] as VestingRecord[],
        lastUpdated: '2024-01-01T00:00:00.000Z',
      }

      saveImportedData(testData)

      const exported = exportDataAsJson()
      expect(exported).toContain('WRC123')
      expect(exported).toContain('9375')

      // Should be valid JSON
      expect(() => JSON.parse(exported)).not.toThrow()
    })
  })

  describe('getStorageUsage', () => {
    it('should return storage usage in bytes', () => {
      const testData = {
        sales: [{ id: '1', withdrawalRef: 'WRC123' }] as ShareSaleRecord[],
        vesting: [{ id: '1', grantNumber: '9375' }] as VestingRecord[],
        lastUpdated: '2024-01-01T00:00:00.000Z',
      }

      saveImportedData(testData)

      const usage = getStorageUsage()
      expect(usage).toBeGreaterThan(0)
      expect(typeof usage).toBe('number')
    })
  })
})

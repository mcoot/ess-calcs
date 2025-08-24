import {
  calculateRsuVestingTaxableIncome,
  convertUsdToAud,
  convertShareEventValue,
  type VestingEvent,
  type TaxableIncomeResult,
} from '@/lib/ess-calculations'

describe('ESS Calculations', () => {
  describe('calculateRsuVestingTaxableIncome', () => {
    it('should calculate taxable income for AUD RSU vesting with zero cost base', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-03-01',
        sharePrice: 50,
        sharesVested: 250,
        costBase: 0,
        currency: 'AUD',
      }

      const result = calculateRsuVestingTaxableIncome(vestingEvent)

      expect(result).toEqual<TaxableIncomeResult>({
        taxableIncome: 12500,
        currency: 'AUD',
        calculation: {
          marketValue: 12500,
          costBase: 0,
          sharesVested: 250,
          sharePrice: 50,
        },
      })
    })

    it('should calculate taxable income with non-zero cost base', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-06-01',
        sharePrice: 70,
        sharesVested: 100,
        costBase: 500,
        currency: 'AUD',
      }

      const result = calculateRsuVestingTaxableIncome(vestingEvent)

      expect(result.taxableIncome).toBe(6500) // (70 * 100) - 500 = 6500
      expect(result.calculation.marketValue).toBe(7000)
      expect(result.calculation.costBase).toBe(500)
    })

    it('should default cost base to 0 if not provided', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-01-01',
        sharePrice: 30,
        sharesVested: 300,
        currency: 'AUD',
      }

      const result = calculateRsuVestingTaxableIncome(vestingEvent)

      expect(result.taxableIncome).toBe(9000) // 30 * 300 - 0
      expect(result.calculation.costBase).toBe(0)
    })

    it('should handle USD vesting with currency conversion', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-03-15',
        sharePrice: 40, // USD
        sharesVested: 100,
        costBase: 0,
        currency: 'USD',
        exchangeRate: 0.65, // USD/AUD rate from docs
      }

      const result = calculateRsuVestingTaxableIncome(vestingEvent)

      // USD $4,000 ÷ 0.6500 = AUD $6,153.85 (precise calculation)
      expect(result.taxableIncome).toBeCloseTo(6153.85, 2)
      expect(result.currency).toBe('AUD')
      expect(result.calculation.sharePrice).toBe(40)
      expect(result.calculation.sharesVested).toBe(100)
    })

    it('should throw error if USD currency provided without exchange rate', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-01-01',
        sharePrice: 40,
        sharesVested: 100,
        currency: 'USD',
        // exchangeRate not provided
      }

      expect(() => calculateRsuVestingTaxableIncome(vestingEvent)).toThrow(
        'Exchange rate required for USD currency conversion'
      )
    })

    it('should handle fractional shares and prices', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-01-01',
        sharePrice: 45.67,
        sharesVested: 123.5,
        costBase: 100.25,
        currency: 'AUD',
      }

      const result = calculateRsuVestingTaxableIncome(vestingEvent)

      const expectedMarketValue = 45.67 * 123.5 // 5640.245
      const expectedTaxableIncome = expectedMarketValue - 100.25

      expect(result.taxableIncome).toBeCloseTo(expectedTaxableIncome, 2)
      expect(result.calculation.marketValue).toBeCloseTo(expectedMarketValue, 2)
    })

    it('should handle scenario from documentation example 1', () => {
      // Year 1 (2024): 300 shares vest
      // Share price: USD $30, AUD rate: 0.6800
      // AUD value: USD $9,000 ÷ 0.6800 = AUD $13,235
      const vestingEvent: VestingEvent = {
        vestDate: '2024-01-01',
        sharePrice: 30,
        sharesVested: 300,
        costBase: 0,
        currency: 'USD',
        exchangeRate: 0.68,
      }

      const result = calculateRsuVestingTaxableIncome(vestingEvent)

      expect(result.taxableIncome).toBeCloseTo(13235.29, 2) // 9000 ÷ 0.6800
      expect(result.currency).toBe('AUD')
    })

    it('should handle scenario from documentation example 2', () => {
      // Year 2 (2025): 300 shares vest
      // Share price: USD $35, AUD rate: 0.6500
      // AUD value: USD $10,500 ÷ 0.6500 = AUD $16,154
      const vestingEvent: VestingEvent = {
        vestDate: '2025-01-01',
        sharePrice: 35,
        sharesVested: 300,
        costBase: 0,
        currency: 'USD',
        exchangeRate: 0.65,
      }

      const result = calculateRsuVestingTaxableIncome(vestingEvent)

      expect(result.taxableIncome).toBeCloseTo(16153.85, 2) // 10500 ÷ 0.6500
    })
  })

  describe('convertUsdToAud', () => {
    it('should convert USD to AUD using exchange rate', () => {
      const result = convertUsdToAud(4000, 0.65, '2025-03-15')

      expect(result.originalAmount).toBe(4000)
      expect(result.originalCurrency).toBe('USD')
      expect(result.convertedAmount).toBeCloseTo(6153.85, 2) // 4000 ÷ 0.6500 = 6153.846...
      expect(result.convertedCurrency).toBe('AUD')
      expect(result.exchangeRate).toBe(0.65)
      expect(result.conversionDate).toBe('2025-03-15')
    })

    it('should handle conversion with decimal precision', () => {
      const result = convertUsdToAud(9000, 0.68, '2024-01-01')

      expect(result.convertedAmount).toBeCloseTo(13235.29, 2) // 9000 ÷ 0.6800 = 13235.294...
      expect(result.originalAmount).toBe(9000)
      expect(result.exchangeRate).toBe(0.68)
    })

    it('should handle small amounts with high precision', () => {
      const result = convertUsdToAud(123.45, 0.6234, '2025-01-01')

      const expectedAud = 123.45 / 0.6234
      expect(result.convertedAmount).toBeCloseTo(expectedAud, 2)
    })

    it('should throw error for invalid exchange rate', () => {
      expect(() => convertUsdToAud(1000, 0, '2025-01-01')).toThrow(
        'Exchange rate must be greater than 0'
      )

      expect(() => convertUsdToAud(1000, -0.5, '2025-01-01')).toThrow(
        'Exchange rate must be greater than 0'
      )
    })

    it('should throw error for negative amount', () => {
      expect(() => convertUsdToAud(-1000, 0.65, '2025-01-01')).toThrow(
        'Amount must be non-negative'
      )
    })

    it('should handle zero amount', () => {
      const result = convertUsdToAud(0, 0.65, '2025-01-01')

      expect(result.convertedAmount).toBe(0)
      expect(result.originalAmount).toBe(0)
    })
  })

  describe('convertShareEventValue', () => {
    it('should convert USD share event to AUD', () => {
      const result = convertShareEventValue(
        40, // USD share price
        100, // quantity
        'USD',
        'AUD',
        0.65,
        '2025-03-15'
      )

      expect(result.originalAmount).toBe(4000) // 40 * 100
      expect(result.convertedAmount).toBeCloseTo(6153.85, 2) // 4000 ÷ 0.6500
      expect(result.originalCurrency).toBe('USD')
      expect(result.convertedCurrency).toBe('AUD')
    })

    it('should handle AUD to AUD conversion (no conversion needed)', () => {
      const result = convertShareEventValue(
        50,
        250,
        'AUD',
        'AUD',
        undefined,
        '2025-01-01'
      )

      expect(result.originalAmount).toBe(12500)
      expect(result.convertedAmount).toBe(12500)
      expect(result.originalCurrency).toBe('AUD')
      expect(result.convertedCurrency).toBe('AUD')
      expect(result.exchangeRate).toBe(1)
    })

    it('should require exchange rate for USD to AUD conversion', () => {
      expect(() =>
        convertShareEventValue(40, 100, 'USD', 'AUD', undefined, '2025-01-01')
      ).toThrow('Exchange rate required for currency conversion')
    })

    it('should require conversion date for USD to AUD conversion', () => {
      expect(() =>
        convertShareEventValue(40, 100, 'USD', 'AUD', 0.65, undefined)
      ).toThrow('Conversion date required for currency conversion')
    })

    it('should handle fractional share prices and quantities', () => {
      const result = convertShareEventValue(
        42.75, // USD share price
        87.5, // quantity
        'USD',
        'AUD',
        0.6234,
        '2025-01-01'
      )

      const expectedUsdValue = 42.75 * 87.5 // 3740.625
      const expectedAudValue = expectedUsdValue / 0.6234

      expect(result.originalAmount).toBeCloseTo(expectedUsdValue, 2)
      expect(result.convertedAmount).toBeCloseTo(expectedAudValue, 2)
    })
  })
})

import {
  calculateRsuVestingTaxableIncome,
  convertUsdToAud,
  convertShareEventValue,
  checkThirtyDayRule,
  calculateCapitalGains,
  processVestingAndSale,
  type VestingEvent,
  type TaxableIncomeResult,
  type ShareSaleEvent,
  type CapitalGainsResult,
  type ThirtyDayRuleResult,
  type CombinedTaxResult,
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

  describe('checkThirtyDayRule', () => {
    it('should identify when 30-day rule applies (same day)', () => {
      const result = checkThirtyDayRule('2025-04-01', '2025-04-01')

      expect(result).toEqual<ThirtyDayRuleResult>({
        applies: true,
        daysBetween: 0,
        vestingDate: '2025-04-01',
        saleDate: '2025-04-01',
        reason: 'Sale occurred within 30 days of vesting (0 days)',
      })
    })

    it('should identify when 30-day rule applies (within 30 days)', () => {
      const result = checkThirtyDayRule('2025-03-01', '2025-03-20')

      expect(result).toEqual<ThirtyDayRuleResult>({
        applies: true,
        daysBetween: 19,
        vestingDate: '2025-03-01',
        saleDate: '2025-03-20',
        reason: 'Sale occurred within 30 days of vesting (19 days)',
      })
    })

    it('should identify when 30-day rule applies (exactly 30 days)', () => {
      const result = checkThirtyDayRule('2025-03-01', '2025-03-31')

      expect(result).toEqual<ThirtyDayRuleResult>({
        applies: true,
        daysBetween: 30,
        vestingDate: '2025-03-01',
        saleDate: '2025-03-31',
        reason: 'Sale occurred within 30 days of vesting (30 days)',
      })
    })

    it('should identify when 30-day rule does NOT apply', () => {
      const result = checkThirtyDayRule('2025-03-01', '2025-04-01')

      expect(result).toEqual<ThirtyDayRuleResult>({
        applies: false,
        daysBetween: 31,
        vestingDate: '2025-03-01',
        saleDate: '2025-04-01',
        reason: 'Sale occurred after 30-day period (31 days)',
      })
    })

    it('should handle month boundaries correctly', () => {
      const result = checkThirtyDayRule('2025-01-15', '2025-02-10')

      expect(result.daysBetween).toBe(26)
      expect(result.applies).toBe(true)
    })

    it('should handle year boundaries correctly', () => {
      const result = checkThirtyDayRule('2024-12-20', '2025-01-15')

      expect(result.daysBetween).toBe(26)
      expect(result.applies).toBe(true)
    })

    it('should handle scenario from documentation (30-day rule example)', () => {
      // Sarah sells shares on 20 March, vested on 1 March (19 days)
      const result = checkThirtyDayRule('2025-03-01', '2025-03-20')

      expect(result.applies).toBe(true)
      expect(result.daysBetween).toBe(19)
    })

    it('should throw error for invalid date order', () => {
      expect(() => checkThirtyDayRule('2025-03-20', '2025-03-01')).toThrow(
        'Sale date cannot be before vesting date'
      )
    })
  })

  describe('calculateCapitalGains', () => {
    it('should calculate capital gain for AUD sale', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-06-01',
        sharesSold: 250,
        salePricePerShare: 70,
        currency: 'AUD',
        brokerageCommission: 25,
        supplementalFees: 5,
      }

      const result = calculateCapitalGains(saleEvent, 12500) // Cost base: 250 shares at $50

      expect(result).toEqual<CapitalGainsResult>({
        capitalGain: 4970, // 17500 - 12500 - 30 = 4970
        isGain: true,
        costBase: 12500,
        saleProceeds: 17500,
        netProceeds: 17470, // 17500 - 30
        currency: 'AUD',
        appliedRule: 'standard-cgt',
        calculation: {
          grossProceeds: 17500,
          totalFees: 30,
          costBase: 12500,
          sharesSold: 250,
          salePricePerShare: 70,
        },
      })
    })

    it('should calculate capital loss for AUD sale', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-06-01',
        sharesSold: 250,
        salePricePerShare: 40,
        currency: 'AUD',
        brokerageCommission: 25,
      }

      const result = calculateCapitalGains(saleEvent, 12500) // Cost base: 250 shares at $50

      expect(result.capitalGain).toBe(-2525) // 10000 - 12500 - 25 = -2525
      expect(result.isGain).toBe(false)
      expect(result.appliedRule).toBe('standard-cgt')
    })

    it('should handle USD sale with currency conversion', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-08-20',
        sharesSold: 100,
        salePricePerShare: 45, // USD
        currency: 'USD',
        exchangeRate: 0.64, // From docs example
        brokerageCommission: 10, // USD
      }

      const result = calculateCapitalGains(saleEvent, 6154) // AUD cost base from vesting

      // USD $4,500 ÷ 0.6400 = AUD $7,031.25 (rounded to $7,031)
      // Capital gain: AUD $7,031 - AUD $6,154 - fees = AUD $877 - fees
      expect(result.capitalGain).toBeCloseTo(862, 0) // $7031.25 - $6154 - $15.625 ≈ $861.62
      expect(result.currency).toBe('AUD')
      expect(result.saleProceeds).toBeCloseTo(7031, 0)
    })

    it('should require exchange rate for USD sales', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-06-01',
        sharesSold: 100,
        salePricePerShare: 45,
        currency: 'USD',
        // exchangeRate missing
      }

      expect(() => calculateCapitalGains(saleEvent, 6000)).toThrow(
        'Exchange rate required for USD sales'
      )
    })

    it('should handle zero fees', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-06-01',
        sharesSold: 100,
        salePricePerShare: 50,
        currency: 'AUD',
        // No fees specified
      }

      const result = calculateCapitalGains(saleEvent, 4000)

      expect(result.calculation.totalFees).toBe(0)
      expect(result.netProceeds).toBe(5000)
      expect(result.capitalGain).toBe(1000) // 5000 - 4000 - 0
    })

    it('should handle fractional shares and prices', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-06-01',
        sharesSold: 123.5,
        salePricePerShare: 67.89,
        currency: 'AUD',
        brokerageCommission: 15.5,
        supplementalFees: 2.25,
      }

      const result = calculateCapitalGains(saleEvent, 5000)

      const expectedProceeds = 123.5 * 67.89 // 8384.515
      const expectedFees = 15.5 + 2.25 // 17.75
      const expectedGain = expectedProceeds - 5000 - expectedFees

      expect(result.saleProceeds).toBeCloseTo(expectedProceeds, 2)
      expect(result.calculation.totalFees).toBeCloseTo(expectedFees, 2)
      expect(result.capitalGain).toBeCloseTo(expectedGain, 2)
    })
  })

  describe('processVestingAndSale', () => {
    it('should apply 30-day rule and calculate combined tax impact', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-04-01',
        sharePrice: 45, // USD
        sharesVested: 200,
        costBase: 0,
        currency: 'USD',
        exchangeRate: 0.63,
      }

      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-04-01', // Same day - 30-day rule applies
        sharesSold: 200,
        salePricePerShare: 45, // USD
        currency: 'USD',
        exchangeRate: 0.63,
        brokerageCommission: 10, // USD
      }

      const result = processVestingAndSale(vestingEvent, saleEvent)

      // With 30-day rule: taxable income is based on sale proceeds, no separate CGT
      // USD $9,000 ÷ 0.6300 = AUD $14,286
      expect(result).toEqual<CombinedTaxResult>({
        taxableIncome: expect.closeTo(14270, 0), // ~14,286 - fees
        capitalGain: 0,
        thirtyDayRuleApplied: true,
        currency: 'AUD',
        vestingResult: null, // No separate vesting taxation due to 30-day rule
        saleResult: expect.objectContaining({
          appliedRule: '30-day',
          capitalGain: 0,
        }),
      })
    })

    it('should calculate standard CGT when 30-day rule does not apply', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2024-06-01',
        sharePrice: 50,
        sharesVested: 250,
        costBase: 0,
        currency: 'AUD',
      }

      const saleEvent: ShareSaleEvent = {
        saleDate: '2024-12-01', // 6 months later - no 30-day rule
        sharesSold: 250,
        salePricePerShare: 70,
        currency: 'AUD',
        brokerageCommission: 25,
      }

      const result = processVestingAndSale(vestingEvent, saleEvent)

      expect(result).toEqual<CombinedTaxResult>({
        taxableIncome: 12500, // Vesting income: 250 × $50
        capitalGain: 4975, // Sale: (250 × $70) - 12500 - 25
        thirtyDayRuleApplied: false,
        currency: 'AUD',
        vestingResult: expect.objectContaining({
          taxableIncome: 12500,
        }),
        saleResult: expect.objectContaining({
          appliedRule: 'standard-cgt',
          capitalGain: 4975,
        }),
      })
    })

    it('should handle mixed currencies with standard CGT', () => {
      // Vesting in USD, sale in USD, both converted to AUD
      const vestingEvent: VestingEvent = {
        vestDate: '2024-03-15',
        sharePrice: 40, // USD
        sharesVested: 100,
        costBase: 0,
        currency: 'USD',
        exchangeRate: 0.65, // Vest rate
      }

      const saleEvent: ShareSaleEvent = {
        saleDate: '2024-08-20',
        sharesSold: 100,
        salePricePerShare: 45, // USD
        currency: 'USD',
        exchangeRate: 0.64, // Sale rate (different from vest)
      }

      const result = processVestingAndSale(vestingEvent, saleEvent)

      expect(result.thirtyDayRuleApplied).toBe(false)
      expect(result.currency).toBe('AUD')
      // Vesting: USD $4,000 ÷ 0.6500 = AUD $6,154
      expect(result.taxableIncome).toBeCloseTo(6153.85, 2)
      // Sale: USD $4,500 ÷ 0.6400 = AUD $7,031
      // CGT: AUD $7,031 - AUD $6,154 = AUD $877
      expect(result.capitalGain).toBeCloseTo(877, 0)
    })

    it('should throw error for mismatched share quantities', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-01-01',
        sharePrice: 50,
        sharesVested: 100, // Vested 100 shares
        currency: 'AUD',
      }

      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-01-15',
        sharesSold: 150, // Trying to sell 150 shares
        salePricePerShare: 55,
        currency: 'AUD',
      }

      expect(() => processVestingAndSale(vestingEvent, saleEvent)).toThrow(
        'Cannot sell more shares (150) than were vested (100)'
      )
    })

    it('should handle partial sales correctly', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-01-01',
        sharePrice: 50,
        sharesVested: 300,
        currency: 'AUD',
      }

      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-06-01', // 5 months later
        sharesSold: 100, // Partial sale
        salePricePerShare: 70,
        currency: 'AUD',
      }

      const result = processVestingAndSale(vestingEvent, saleEvent)

      expect(result.taxableIncome).toBe(15000) // 300 × $50 (full vesting income)
      // Partial CGT: (100 × $70) - (100 × $50) = $2,000
      expect(result.capitalGain).toBe(2000)
      expect(result.saleResult.calculation.sharesSold).toBe(100)
    })
  })
})

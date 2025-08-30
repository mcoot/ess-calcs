import {
  calculateRsuVestingTaxableIncome,
  convertUsdToAud,
  convertShareEventValue,
  checkThirtyDayRule,
  calculateCapitalGains,
  calculateCgtDiscount,
  type VestingEvent,
  type TaxableIncomeResult,
  type ShareSaleEvent,
  type CapitalGainsResult,
  type ThirtyDayRuleResult,
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
        remainingShares: 250,
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
      expect(result.remainingShares).toBe(100)
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
      expect(result.remainingShares).toBe(300)
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
      expect(result.remainingShares).toBe(123.5)
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
      expect(result.remainingShares).toBe(300)
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
      expect(result.remainingShares).toBe(300)
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
        cgtDiscount: {
          eligible: false,
          holdingPeriodDays: 0,
          discountRate: 0,
          grossCapitalGain: 4970,
          discountedCapitalGain: 4970,
        },
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

  describe('calculateCgtDiscount', () => {
    it('should apply 50% discount for holdings > 365 days with capital gain', () => {
      const result = calculateCgtDiscount(
        '2023-06-01', // Acquisition
        '2024-12-01', // Sale (18 months later)
        5000 // Capital gain
      )

      expect(result.eligible).toBe(true)
      expect(result.holdingPeriodDays).toBeGreaterThan(365) // 18 months is definitely > 365 days
      expect(result.discountRate).toBe(0.5)
      expect(result.grossCapitalGain).toBe(5000)
      expect(result.discountedCapitalGain).toBe(2500) // 50% discount applied
    })

    it('should NOT apply discount for holdings <= 365 days', () => {
      const result = calculateCgtDiscount(
        '2024-06-01', // Acquisition
        '2024-12-01', // Sale (6 months later)
        3000 // Capital gain
      )

      expect(result).toEqual({
        eligible: false,
        holdingPeriodDays: 183, // 6 months
        discountRate: 0,
        grossCapitalGain: 3000,
        discountedCapitalGain: 3000, // No discount applied
      })
    })

    it('should NOT apply discount for capital losses (even if held > 365 days)', () => {
      const result = calculateCgtDiscount(
        '2023-01-01',
        '2024-06-01', // 17 months later
        -2000 // Capital loss
      )

      expect(result).toEqual({
        eligible: true, // Eligible based on time, but...
        holdingPeriodDays: 517,
        discountRate: 0, // No discount for losses
        grossCapitalGain: -2000,
        discountedCapitalGain: -2000, // Loss unchanged
      })
    })

    it('should handle exactly 365 days (no discount)', () => {
      const result = calculateCgtDiscount(
        '2024-01-01',
        '2024-12-31', // Exactly 365 days
        1000
      )

      expect(result).toEqual({
        eligible: false, // Must be > 365 days
        holdingPeriodDays: 365,
        discountRate: 0,
        grossCapitalGain: 1000,
        discountedCapitalGain: 1000,
      })
    })

    it('should handle 366 days (discount applies)', () => {
      const result = calculateCgtDiscount(
        '2024-01-01',
        '2025-01-01', // 366 days
        2000
      )

      expect(result).toEqual({
        eligible: true,
        holdingPeriodDays: 366,
        discountRate: 0.5,
        grossCapitalGain: 2000,
        discountedCapitalGain: 1000,
      })
    })

    it('should handle scenario from documentation (18 months holding)', () => {
      // From docs: Sarah holds shares for 18 months
      // Vested: 1 June 2023, Sale: 1 December 2024
      // Capital gain: $5,000, 50% discount = $2,500
      const result = calculateCgtDiscount('2023-06-01', '2024-12-01', 5000)

      expect(result.eligible).toBe(true)
      expect(result.holdingPeriodDays).toBeGreaterThan(365)
      expect(result.discountRate).toBe(0.5)
      expect(result.discountedCapitalGain).toBe(2500)
    })

    it('should handle fractional gains with proper rounding', () => {
      const result = calculateCgtDiscount(
        '2023-01-01',
        '2024-06-01',
        3333.33 // Will result in $1666.665 after discount
      )

      expect(result.discountedCapitalGain).toBe(1666.67) // Rounded to 2 decimals
    })

    it('should throw error for invalid date order', () => {
      expect(() =>
        calculateCgtDiscount('2025-01-01', '2024-01-01', 1000)
      ).toThrow('Sale date cannot be before acquisition date')
    })

    it('should handle same day acquisition and sale', () => {
      const result = calculateCgtDiscount('2024-01-01', '2024-01-01', 1000)

      expect(result).toEqual({
        eligible: false,
        holdingPeriodDays: 0,
        discountRate: 0,
        grossCapitalGain: 1000,
        discountedCapitalGain: 1000,
      })
    })
  })

  describe('Capital Gains with CGT Discount Integration', () => {
    it('should calculate capital gains with 50% discount for long-term holdings', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2024-12-01',
        sharesSold: 250,
        salePricePerShare: 70,
        currency: 'AUD',
        brokerageCommission: 25,
        acquisitionDate: '2023-06-01', // 18 months ago
      }

      const result = calculateCapitalGains(saleEvent, 12500)

      // Expected: (250 × $70) - $12,500 - $25 = $4,975
      // With 50% discount: $4,975 × 50% = $2,487.50
      expect(result.capitalGain).toBe(2487.5)
      expect(result.cgtDiscount.eligible).toBe(true)
      expect(result.cgtDiscount.discountRate).toBe(0.5)
      expect(result.cgtDiscount.grossCapitalGain).toBe(4975)
      expect(result.cgtDiscount.discountedCapitalGain).toBe(2487.5)
    })

    it('should NOT apply discount for short-term holdings', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2024-12-01',
        sharesSold: 100,
        salePricePerShare: 60,
        currency: 'AUD',
        acquisitionDate: '2024-06-01', // 6 months ago
      }

      const result = calculateCapitalGains(saleEvent, 5000)

      expect(result.capitalGain).toBe(1000) // No discount
      expect(result.cgtDiscount.eligible).toBe(false)
      expect(result.cgtDiscount.discountRate).toBe(0)
    })

    it('should handle CGT discount with USD conversion', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2026-06-15',
        sharesSold: 600,
        salePricePerShare: 40, // USD
        currency: 'USD',
        exchangeRate: 0.62, // USD/AUD
        acquisitionDate: '2024-01-01', // > 2 years ago
      }

      // Cost base from doc example: AUD $29,389
      const result = calculateCapitalGains(saleEvent, 29389)

      // USD $24,000 ÷ 0.62 = AUD $38,709.68 (precise)
      // Capital gain: AUD $38,709.68 - AUD $29,389 = AUD $9,320.68
      // 50% discount: AUD $9,320.68 × 50% = AUD $4,660.34
      expect(result.capitalGain).toBeCloseTo(4660.34, 1)
      expect(result.cgtDiscount.eligible).toBe(true)
      expect(result.cgtDiscount.discountRate).toBe(0.5)
    })

    it('should handle capital losses without discount', () => {
      const saleEvent: ShareSaleEvent = {
        saleDate: '2025-12-01',
        sharesSold: 100,
        salePricePerShare: 30, // Lower than cost base
        currency: 'AUD',
        acquisitionDate: '2023-06-01', // Long-term holding
      }

      const result = calculateCapitalGains(saleEvent, 5000)

      expect(result.capitalGain).toBe(-2000) // Loss unchanged
      expect(result.cgtDiscount.eligible).toBe(true) // Time-wise eligible
      expect(result.cgtDiscount.discountRate).toBe(0) // But no discount for losses
      expect(result.cgtDiscount.discountedCapitalGain).toBe(-2000)
    })
  })

  describe('Enhanced calculateRsuVestingTaxableIncome with Sale Events', () => {
    it('should apply 30-day rule when sale occurs within 30 days', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-04-01',
        sharePrice: 45, // USD
        sharesVested: 200,
        costBase: 0,
        currency: 'USD',
        exchangeRate: 0.63,
      }

      const saleEvents: ShareSaleEvent[] = [
        {
          saleDate: '2025-04-01', // Same day - 30-day rule applies
          sharesSold: 200,
          salePricePerShare: 45, // USD
          currency: 'USD',
          exchangeRate: 0.63,
          brokerageCommission: 10, // USD
        },
      ]

      const result = calculateRsuVestingTaxableIncome(vestingEvent, saleEvents)

      // With 30-day rule: taxable income is adjusted based on sale proceeds
      // USD $9,000 ÷ 0.6300 = AUD $14,286, minus fees
      expect(result.taxableIncome).toBeCloseTo(14270, 0)
      expect(result.remainingShares).toBe(0)
      expect(result.saleEvents).toHaveLength(1)
      expect(result.saleEvents?.[0].thirtyDayRule.applies).toBe(true)
      expect(result.saleEvents?.[0].thirtyDayRule.daysBetween).toBe(0)
    })

    it('should handle partial sales with 30-day rule', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-06-01',
        sharePrice: 50,
        sharesVested: 300,
        currency: 'AUD',
      }

      const saleEvents: ShareSaleEvent[] = [
        {
          saleDate: '2025-06-15', // 14 days later - 30-day rule applies
          sharesSold: 100, // Partial sale
          salePricePerShare: 60,
          currency: 'AUD',
          brokerageCommission: 25,
        },
      ]

      const result = calculateRsuVestingTaxableIncome(vestingEvent, saleEvents)

      // Vesting income for 200 remaining shares: 200 * $50 = $10,000
      // 30-day rule income for 100 sold shares: (100 * $60) - (100 * $0) - $25 = $5,975
      // Total: $10,000 + $5,975 = $15,975
      expect(result.taxableIncome).toBe(15975)
      expect(result.remainingShares).toBe(200)
      expect(result.saleEvents).toHaveLength(1)
      expect(result.saleEvents?.[0].thirtyDayRule.applies).toBe(true)
    })

    it('should handle sales after 30-day period without adjustment', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2024-06-01',
        sharePrice: 50,
        sharesVested: 250,
        currency: 'AUD',
      }

      const saleEvents: ShareSaleEvent[] = [
        {
          saleDate: '2024-12-01', // 6 months later - no 30-day rule
          sharesSold: 100,
          salePricePerShare: 70,
          currency: 'AUD',
          brokerageCommission: 25,
        },
      ]

      const result = calculateRsuVestingTaxableIncome(vestingEvent, saleEvents)

      // Normal vesting income: 250 * $50 = $12,500 (unaffected by later sales)
      expect(result.taxableIncome).toBe(12500)
      expect(result.remainingShares).toBe(150)
      expect(result.saleEvents).toHaveLength(1)
      expect(result.saleEvents?.[0].thirtyDayRule.applies).toBe(false)
      expect(result.saleEvents?.[0].thirtyDayRule.daysBetween).toBeGreaterThan(
        30
      )
    })

    it('should handle multiple sales with mixed 30-day rule application', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-03-01',
        sharePrice: 40,
        sharesVested: 300,
        currency: 'AUD',
      }

      const saleEvents: ShareSaleEvent[] = [
        {
          saleDate: '2025-03-20', // 19 days later - 30-day rule applies
          sharesSold: 100,
          salePricePerShare: 45,
          currency: 'AUD',
          brokerageCommission: 15,
        },
        {
          saleDate: '2025-05-01', // 61 days later - no 30-day rule
          sharesSold: 50,
          salePricePerShare: 50,
          currency: 'AUD',
          brokerageCommission: 10,
        },
      ]

      const result = calculateRsuVestingTaxableIncome(vestingEvent, saleEvents)

      // Vesting income for 150 remaining shares: 150 * $40 = $6,000
      // Normal vesting income for 50 shares sold after 30 days: 50 * $40 = $2,000
      // 30-day rule income for 100 shares: (100 * $45) - (100 * $0) - $15 = $4,485
      // Total: $6,000 + $2,000 + $4,485 = $12,485
      expect(result.taxableIncome).toBe(12485)
      expect(result.remainingShares).toBe(150)
      expect(result.saleEvents).toHaveLength(2)
      expect(result.saleEvents?.[0].thirtyDayRule.applies).toBe(true)
      expect(result.saleEvents?.[1].thirtyDayRule.applies).toBe(false)
    })

    it('should throw error when trying to sell more shares than vested', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-01-01',
        sharePrice: 50,
        sharesVested: 100,
        currency: 'AUD',
      }

      const saleEvents: ShareSaleEvent[] = [
        {
          saleDate: '2025-01-15',
          sharesSold: 150, // More than vested
          salePricePerShare: 55,
          currency: 'AUD',
        },
      ]

      expect(() =>
        calculateRsuVestingTaxableIncome(vestingEvent, saleEvents)
      ).toThrow('Cannot sell more shares (150) than were vested (100)')
    })

    it('should handle USD sales with currency conversion in 30-day rule', () => {
      const vestingEvent: VestingEvent = {
        vestDate: '2025-04-01',
        sharePrice: 45, // USD
        sharesVested: 200,
        costBase: 0,
        currency: 'USD',
        exchangeRate: 0.63,
      }

      const saleEvents: ShareSaleEvent[] = [
        {
          saleDate: '2025-04-05', // 4 days later - 30-day rule applies
          sharesSold: 200,
          salePricePerShare: 47, // USD (higher price)
          currency: 'USD',
          exchangeRate: 0.64, // Different exchange rate at sale
          brokerageCommission: 12, // USD
        },
      ]

      const result = calculateRsuVestingTaxableIncome(vestingEvent, saleEvents)

      // Sale proceeds: 200 * $47 = $9,400 USD
      // Convert to AUD: $9,400 ÷ 0.64 = $14,687.50 AUD
      // Fees: $12 ÷ 0.64 = $18.75 AUD
      // Taxable income: $14,687.50 - $0 - $18.75 = $14,668.75
      expect(result.taxableIncome).toBeCloseTo(14668.75, 2)
      expect(result.remainingShares).toBe(0)
    })
  })
})

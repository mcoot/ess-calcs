# Australian Tax Office (ATO) ESS and RSU Tax Calculations Guide

This guide covers the essential calculations required for Australian tax compliance on Employee Share Schemes (ESS) and Restricted Stock Units (RSUs) with a 4-year vesting schedule.

## Table of Contents

1. [Overview](#overview)
2. [Taxable Income from RSU Vesting](#taxable-income-from-rsu-vesting)
3. [30-Day Rule for Share Sales](#30-day-rule-for-share-sales)
4. [Capital Gains and Losses on Share Sales](#capital-gains-and-losses-on-share-sales)
5. [Currency Conversion (USD to AUD)](#currency-conversion-usd-to-aud)
6. [Practical Examples](#practical-examples)
7. [Record Keeping Requirements](#record-keeping-requirements)

---

## Overview

Under Australian tax law, RSUs are typically treated as tax-deferred Employee Share Schemes (ESS). This means:

- **No tax** is paid when RSUs are granted
- **Income tax** is paid when RSUs vest (the deferred taxing point)
- **Capital Gains Tax (CGT)** applies when vested shares are sold

For RSUs with a **4-year vesting schedule** (typically 25% per year), each tranche is treated as a separate tax event.

---

## Taxable Income from RSU Vesting

### Formula for Taxable Income at Vesting

```
Taxable Income = Market Value of Shares at Vesting - Cost Base
```

Where:

- **Market Value at Vesting** = Share price × Number of shares vesting
- **Cost Base** = Amount paid for the shares (typically $0 for RSUs)

### Equation

```
ESS Discount = (Share Price at Vesting × Shares Vested) - Amount Paid
```

### Example: RSU Vesting

**Scenario:** Sarah receives 1,000 RSUs that vest 25% per year over 4 years.

**Year 1 Vesting (250 shares):**

- Share price at vesting: AUD $50
- Amount paid: $0
- Market value at vesting: 250 × $50 = $12,500
- Taxable income: $12,500 - $0 = **$12,500**

This amount is included in Sarah's assessable income and taxed at her marginal tax rate.

---

## 30-Day Rule for Share Sales

The **30-day rule** applies when shares are sold within 30 days of the deferred taxing point (vesting date).

### How the 30-Day Rule Works

If shares are sold within 30 days of vesting:

- The **sale date** becomes the new taxing point (instead of the vesting date)
- The **sale price** is used to calculate the taxable income
- No separate capital gain/loss occurs on the sale

### Formula When 30-Day Rule Applies

```
Taxable Income = Sale Proceeds - Cost Base
```

### Example: 30-Day Rule Application

**Scenario:** Continuing Sarah's example:

- 250 shares vest on 1 March 2025 at $50/share
- Sarah sells all 250 shares on 20 March 2025 for $52/share

**Without 30-day rule:**

- Taxable income at vesting: 250 × $50 = $12,500
- Capital gain on sale: (250 × $52) - (250 × $50) = $500

**With 30-day rule applied:**

- Taxable income: 250 × $52 = **$13,000** (reported in 2024-25 tax year)
- No capital gain/loss on sale

---

## Capital Gains and Losses on Share Sales

When vested shares are sold **after** the 30-day period, Capital Gains Tax (CGT) applies.

### Basic CGT Calculation

```
Capital Gain/Loss = Capital Proceeds - Cost Base
```

Where:

- **Capital Proceeds** = Sale price × Number of shares sold
- **Cost Base** = Market value at vesting date × Number of shares sold

### 50% CGT Discount for Long-Term Holdings

If shares are held for **more than 12 months** from the vesting date:

```
Net Capital Gain = (Capital Gain - Capital Losses) × 50%
```

**Requirements for 50% discount:**

- Australian tax resident
- Asset held for more than 12 months
- Not carrying on a business of share trading

### CGT Calculation Steps

1. **Calculate gross capital gain/loss**
2. **Apply any capital losses** from current or previous years
3. **Apply 50% discount** (if eligible)
4. **Report net capital gain** in tax return

### Example: CGT Calculation with 50% Discount

**Scenario:** Sarah holds her vested shares for 18 months before selling.

**Vesting details:**

- Vested: 1 June 2023
- Market value at vesting: $50/share (250 shares)
- Cost base: 250 × $50 = $12,500

**Sale details:**

- Sale date: 1 December 2024 (18 months later)
- Sale price: $70/share
- Sale proceeds: 250 × $70 = $17,500

**CGT Calculation:**

1. Capital gain: $17,500 - $12,500 = $5,000
2. Apply capital losses: Assume $1,000 loss from other shares = $5,000 - $1,000 = $4,000
3. Apply 50% discount: $4,000 × 50% = **$2,000**
4. Net capital gain to report: **$2,000**

---

## Currency Conversion (USD to AUD)

For US-listed shares, all amounts must be converted to AUD using official ATO exchange rates.

### Exchange Rate Rules

**At Vesting (ESS Income):**

```
AUD Value = USD Value × ATO Exchange Rate on Vesting Date
```

**At Sale (CGT Calculation):**

```
AUD Sale Proceeds = USD Sale Proceeds × ATO Exchange Rate on Sale Date
```

### Data Sources

1. **Primary Source:** [Reserve Bank of Australia (RBA) Exchange Rates](https://www.rba.gov.au/statistics/frequency/exchange-rates.html)
2. **ATO Monthly Rates:** Available on ATO website for each financial year
3. **Alternative:** Any reasonable externally sourced exchange rate

### Conversion Example

**Scenario:** US company RSUs vesting and sale

**Vesting Event:**

- Vest date: 15 March 2025
- US share price: USD $40
- Shares vested: 100
- ATO USD/AUD rate on 15 March 2025: 0.6500
- AUD market value: USD $4,000 ÷ 0.6500 = **AUD $6,154**

**Sale Event:**

- Sale date: 20 August 2025
- US sale price: USD $45
- ATO USD/AUD rate on 20 August 2025: 0.6400
- AUD sale proceeds: USD $4,500 ÷ 0.6400 = **AUD $7,031**

**CGT Calculation:**

- Capital gain: AUD $7,031 - AUD $6,154 = **AUD $877**

---

## Practical Examples

### Example 1: Complete 4-Year RSU Cycle

**Grant:** 1,200 RSUs granted 1 January 2023, vesting 25% annually

**Year 1 (2024):** 300 shares vest

- Vest date: 1 January 2024
- Share price: USD $30, AUD rate: 0.6800
- AUD value: USD $9,000 ÷ 0.6800 = AUD $13,235
- **Taxable income:** AUD $13,235

**Year 2 (2025):** 300 shares vest

- Vest date: 1 January 2025
- Share price: USD $35, AUD rate: 0.6500
- AUD value: USD $10,500 ÷ 0.6500 = AUD $16,154
- **Taxable income:** AUD $16,154

**Sale in 2026:** Sell all 600 vested shares

- Sale date: 15 June 2026
- Sale price: USD $40, AUD rate: 0.6200
- Total AUD proceeds: USD $24,000 ÷ 0.6200 = AUD $38,710

**CGT Calculation:**

- Cost base: AUD $13,235 + AUD $16,154 = AUD $29,389
- Capital gain: AUD $38,710 - AUD $29,389 = AUD $9,321
- 50% discount applies (held > 12 months): AUD $9,321 × 50% = **AUD $4,661**

### Example 2: Same-Day Sale (30-Day Rule)

**Scenario:** Employee immediately sells vested shares

**Vesting and Sale:**

- Vest date: 1 April 2025
- Sale date: 1 April 2025 (same day)
- Shares: 200
- USD price at vest/sale: $45
- ATO rate: 0.6300
- AUD value: USD $9,000 ÷ 0.6300 = AUD $14,286

**Tax Treatment:**

- **Taxable income:** AUD $14,286 (no separate CGT event)
- **Capital gain:** $0 (30-day rule applies)

---

## Record Keeping Requirements

### Essential Records to Maintain

**At Grant:**

- Grant date and number of RSUs
- Grant agreement terms
- Vesting schedule

**At Each Vesting:**

- Vesting date
- Number of shares vested
- Share price (USD and AUD)
- Exchange rate used
- ATO ESS statement from employer

**At Sale:**

- Sale date
- Number of shares sold
- Sale price (USD and AUD)
- Exchange rate used
- Brokerage and selling costs

### Employer Reporting

Employers must provide:

- **ESS Annual Report** to ATO by 14 August
- **ESS Statement** to employee by 14 July
- Details of vesting events and discount amounts

### Tax Return Reporting

**ESS Income:** Report at Item 12 (Supplementary tax return)

- Label F: "Discount from deferral schemes"

**Capital Gains:** Report at Item 18 (Supplementary tax return)

- Label H: "Total current year capital gains"
- Label A: "Net capital gain"

---

## Key Takeaways

1. **RSUs are tax-deferred** until vesting - no tax on grant
2. **Vesting creates taxable income** at marginal tax rates
3. **30-day rule** can change the taxing point to sale date
4. **CGT applies** to post-vesting share sales with potential 50% discount
5. **Currency conversion** must use ATO official rates
6. **Detailed records** are essential for compliance
7. **Professional advice** recommended for complex situations

This guide provides the foundation for understanding ATO ESS and RSU calculations. Always consult current ATO guidance and consider professional tax advice for your specific circumstances.

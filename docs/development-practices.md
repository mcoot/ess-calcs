# Development Practices

## Core Principles

### Frontend-Only Architecture

This application is designed as a **client-side only** solution with no backend dependencies:

- All calculations performed in the browser using TypeScript/JavaScript
- No server-side processing or database requirements
- Static hosting compatible (GitHub Pages, Netlify, Vercel, S3, etc.)
- Data remains entirely on the user's device for privacy and security
- Offline capability once loaded (Progressive Web App potential)
- Easy deployment and maintenance with no server infrastructure

### Simplicity First

- Write code that is easy to read and understand
- Prefer explicit over implicit behavior
- Keep functions small and focused on a single responsibility
- Avoid premature optimization - clarity over cleverness
- Use descriptive names for variables, functions, and components

### Test-Driven Development

Unit testing forms the foundation of our development approach:

- Write tests before implementing functionality (TDD)
- Aim for high test coverage, especially for business logic
- Tests serve as living documentation of expected behavior
- Every bug fix should include a test that prevents regression

## Code Organization

### File Structure

```
src/
├── components/        # React components
├── lib/              # Business logic and utilities
├── pages/            # Next.js pages
├── types/            # TypeScript type definitions
├── utils/            # Pure utility functions
└── __tests__/        # Test files (mirror src structure)
```

### Function Design

- Keep functions pure when possible (no side effects)
- Functions should do one thing well
- Maximum 20-30 lines per function
- Clear input/output contracts with TypeScript types
- Separate business logic from UI components

## Testing Strategy

### Unit Tests

- **What to test**: Business logic, utility functions, data transformations
- **Tools**: Jest for test runner, React Testing Library for component tests
- **Coverage**: Aim for 90%+ coverage on business logic
- **Naming**: Descriptive test names that explain expected behavior

### Test Structure

```javascript
describe('calculateCapitalGains', () => {
  it('should calculate gain when sale price exceeds cost basis', () => {
    // Arrange
    const transaction = { costBasis: 100, salePrice: 150, quantity: 10 }

    // Act
    const result = calculateCapitalGains(transaction)

    // Assert
    expect(result.gain).toBe(500)
    expect(result.isGain).toBe(true)
  })
})
```

### Business Logic Testing

Focus heavily on testing:

- Tax calculation functions
- Currency conversion logic
- CSV parsing and validation
- 30-day rule implementation
- Date handling and calculations

### Component Testing

- Test user interactions, not implementation details
- Focus on what users see and do
- Mock external dependencies
- Test error states and edge cases

## Code Quality Standards

### TypeScript Usage

- Strict TypeScript configuration
- Define clear interfaces for all data structures
- Avoid `any` type - use proper typing
- Use union types for controlled values

### Error Handling

- Use Result/Either patterns for operations that can fail
- Provide meaningful error messages
- Handle edge cases explicitly
- Never fail silently

### Performance Considerations

- Optimize only when measurements show need
- Use React.memo judiciously for expensive components
- Implement proper loading states
- Consider data size for CSV processing

## Development Workflow

### Feature Development

1. **Design**: Write or update type definitions
2. **Test**: Create failing tests for new functionality
3. **Implement**: Write minimal code to pass tests
4. **Refactor**: Clean up while keeping tests green
5. **Review**: Self-review for simplicity and clarity

### Git Practices

- Small, focused commits with clear messages
- Feature branches for new functionality
- Squash commits before merging to main
- Include test updates in the same commit as code changes

### Code Review Checklist

- [ ] Tests cover new functionality
- [ ] Code follows simplicity principles
- [ ] Error cases are handled
- [ ] Types are properly defined
- [ ] No TODO comments in production code

## Specific Guidelines for ESS Calculations

### Tax Logic

- Separate ATO rules into pure functions
- Test edge cases: leap years, weekend dates, currency precision
- Document tax year boundaries and special cases
- Validate all monetary calculations with multiple test cases

### Data Processing

- Validate CSV data before processing
- Handle malformed data gracefully
- Test with various date formats
- Ensure currency conversion accuracy

### Example Test Coverage

```javascript
// Good: Comprehensive tax calculation test
describe('ESS 30-day rule', () => {
  it('should apply discount when sold within 30 days', () => {
    const vestDate = '2024-05-13'
    const saleDate = '2024-05-15'
    const result = calculateESSDiscount(vestDate, saleDate, shareValue)
    expect(result.discountApplies).toBe(true)
  })

  it('should not apply discount when sold after 30 days', () => {
    const vestDate = '2024-05-13'
    const saleDate = '2024-06-15'
    const result = calculateESSDiscount(vestDate, saleDate, shareValue)
    expect(result.discountApplies).toBe(false)
  })
})
```

## Tools and Setup

### Required Dependencies

- Jest for testing framework
- React Testing Library for component tests
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Husky for pre-commit hooks

### VS Code Extensions (Recommended)

- TypeScript and JavaScript Language Features
- Jest Test Explorer
- ESLint
- Prettier

## Continuous Integration

### Pre-commit Checks

- Run all tests
- TypeScript compilation check
- Linting and formatting
- No console.log statements in production code

### Definition of Done

A feature is complete when:

- [ ] All tests pass
- [ ] Code coverage meets standards
- [ ] TypeScript compiles without errors
- [ ] Manual testing confirms expected behavior
- [ ] Documentation updated if needed

## Static Deployment

### Building for Production

```bash
npm run build:static
```

This creates an `out/` directory with all static files ready for hosting.

### Deployment Options

**GitHub Pages:**

1. Push the `out/` directory to a `gh-pages` branch
2. Enable GitHub Pages in repository settings

**Netlify:**

1. Connect repository to Netlify
2. Set build command: `npm run build:static`
3. Set publish directory: `out`

**Vercel:**

1. Connect repository to Vercel
2. Deployment configuration is automatic with `next.config.js`

**AWS S3/CloudFront:**

1. Upload contents of `out/` directory to S3 bucket
2. Configure bucket for static website hosting
3. Optional: Add CloudFront for CDN

**Any Static Host:**

- The `out/` directory contains pure HTML/CSS/JS
- Upload to any web server or CDN
- No server-side processing required

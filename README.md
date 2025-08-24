# ESS Tax Calculator

Australian Employee Share Scheme (ESS) tax calculation utilities built with Next.js.

## Features

- Import CSV share sale reports
- Calculate capital gains and losses
- Handle 30-day rule calculations
- Currency conversion tracking
- Generate tax-ready reports

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
npm install
```

### Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript checks
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Business logic and utilities
├── types/            # TypeScript type definitions
├── utils/            # Pure utility functions
└── __tests__/        # Test files
```

## Testing

This project uses Jest and React Testing Library with a focus on:

- High test coverage (90%+ for business logic)
- Test-driven development
- Comprehensive testing of tax calculations

## Documentation

See the `docs/` directory for detailed documentation:

- [Overview](./docs/overview.md) - Project goals and features
- [Development Practices](./docs/development-practices.md) - Coding standards and testing approach

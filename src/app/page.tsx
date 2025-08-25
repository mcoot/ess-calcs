export default function HomePage() {
  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          ESS Tax Calculator
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Welcome to the Australian Employee Share Scheme tax calculation
          utilities.
        </p>
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Features
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Import CSV share sale reports
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Calculate capital gains and losses
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Handle 30-day rule calculations
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Currency conversion tracking
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Generate tax-ready reports
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}

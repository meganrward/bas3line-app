export function SalesCommissions() {
  return (
    <div className="card p-10 flex flex-col items-center gap-3 text-center">
      <svg
        className="w-10 h-10 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <h2 className="heading-section">Sales &amp; commissions</h2>
      <p className="text-sm text-gray-400 max-w-sm">
        Sales and commission data will appear here once the Bas3line internal API
        integration is configured.
      </p>
    </div>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="21" fill="none" stroke="#38e7ff" strokeWidth="4" />
        <circle cx="32" cy="32" r="8" fill="none" stroke="#38e7ff" strokeWidth="3" />
        <path
          d="M32 11v13M32 40v13M11 32h13M40 32h13"
          stroke="#38e7ff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div>
        <span className="brand-title">OPEN-WHEEL WORKSHOP</span>
        <span className="brand-sub">HOLOGRAPHIC ASSEMBLY BAY · 01</span>
      </div>
    </div>
  )
}

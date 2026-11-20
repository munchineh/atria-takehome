/** "Made from" lineage icon: a corner-down-right arrow at a 2 px stroke (antd's BranchesOutlined read too thin, Mancini 20 Nov 17:50). */
export function MadeFromIcon({ size = 14 }: { size?: number }) {
  return (
    <span role="img" aria-hidden className="anticon made-from-icon">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4v7a4 4 0 0 0 4 4h10" />
        <path d="M15 11l4 4-4 4" />
      </svg>
    </span>
  );
}

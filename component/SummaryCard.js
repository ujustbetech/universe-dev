import Link from 'next/link';

const SummaryCard = ({ count, label, href, className = '' }) => (
  <Link href={href}>
    <div className={`summary-card ${className}`}>
      <p className="count">{count}</p>
      <p className="label">{label}</p>
    </div>
  </Link>
);

export default SummaryCard;

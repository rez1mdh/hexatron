// src/components/ui/CanonBadge.tsx

import type { CanonStatus } from '../../db/schema';

const LABELS: Record<CanonStatus, string> = {
  canon: 'Canon',
  provisional: 'Provisional',
  disputed: 'Disputed',
  non_canon: 'Non-Canon',
  alternate: 'Alt. Timeline',
};

interface Props { status: CanonStatus; }

export default function CanonBadge({ status }: Props) {
  return (
    <span className={`canon-badge canon-${status.replace('_', '-')}`}>
      {LABELS[status]}
    </span>
  );
}

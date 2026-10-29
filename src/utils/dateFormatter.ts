// src/utils/dateFormatter.ts — robust date and relative time formatting for articles and drafts

export function formatFullDate(timestamp?: number): string {
  if (!timestamp || isNaN(timestamp)) return 'Unknown';
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

export function formatRelativeTime(timestamp?: number): string {
  if (!timestamp || isNaN(timestamp)) return 'unknown time';
  try {
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return formatFullDate(timestamp);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'just now';
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 60) return `${diffMin} mins ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return formatFullDate(timestamp);
  } catch {
    return 'unknown time';
  }
}

export function formatDateTime(timestamp?: number): string {
  if (!timestamp || isNaN(timestamp)) return 'Unknown';
  try {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
}

export function formatArticleDates(createdAt?: number, updatedAt?: number): {
  createdText: string;
  editedText: string;
  fullCreatedTooltip: string;
  fullEditedTooltip: string;
} {
  const createdText = createdAt ? `Created ${formatFullDate(createdAt)}` : '';
  const editedText = updatedAt ? `Edited ${formatRelativeTime(updatedAt)}` : '';
  const fullCreatedTooltip = createdAt ? `Created: ${formatDateTime(createdAt)}` : 'Created date unknown';
  const fullEditedTooltip = updatedAt ? `Last edited: ${formatDateTime(updatedAt)}` : 'Last edit date unknown';

  return {
    createdText,
    editedText,
    fullCreatedTooltip,
    fullEditedTooltip,
  };
}


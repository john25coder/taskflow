export function formatDueDate(value: string | null): string {
  if (!value) return 'Sem prazo';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short' })
    .format(new Date(`${value}T00:00:00Z`));
}

export function isOverdue(value: string | null, status: string, today = new Date()): boolean {
  if (!value || status === 'done') return false;
  const due = new Date(`${value}T23:59:59`);
  return due.getTime() < today.getTime();
}

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

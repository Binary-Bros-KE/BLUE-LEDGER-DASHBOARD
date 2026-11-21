// Every date the admin panel shows is DD/MM/YYYY, whatever the browser's locale.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "21/11/2026" */
export function formatDate(value: string | Date): string {
  const date = new Date(value);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "21/11/2026 14:05" */
export function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

import { Platform } from 'react-native';
import { Timestamp } from 'firebase/firestore';

export function tsToDate(value: Timestamp | { seconds: number } | null | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof (value as { seconds: number }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return new Date();
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDate(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(d: Date): string {
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

export function formatMonthDay(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex] ?? '';
}

/** "MM-DD" from a date (only month and day matter). */
export function dateToMonthDay(d: Date): string {
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse "MM-DD" into a Date (year is fixed at 2000). */
export function monthDayToDate(md: string): Date {
  const [month, day] = md.split('-').map(Number);
  const safeMonth = Number.isFinite(month) ? month - 1 : 0;
  const safeDay = Number.isFinite(day) ? day : 1;
  return new Date(2000, safeMonth, safeDay);
}

/** True if the "MM-DD" string falls in the given month (0-11). */
export function isInMonth(md: string | undefined | null, monthIndex: number): boolean {
  if (!md) return false;
  const month = parseInt(md.split('-')[0], 10);
  return month === monthIndex + 1;
}

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatChatTime(value: Timestamp | { seconds: number } | null | undefined): string {
  const d = tsToDate(value);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  return sameDay ? formatTime(d) : `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function localTimezone(): string {
  return Platform.OS === 'web' ? '' : Intl.DateTimeFormat().resolvedOptions().timeZone;
}
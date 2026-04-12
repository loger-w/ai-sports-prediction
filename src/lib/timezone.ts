import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/** Returns the IANA timezone string from the user's browser, e.g. "America/New_York" */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Returns today's date in YYYY-MM-DD in the user's local timezone */
export function localToday(): string {
  return dayjs().tz(getUserTimezone()).format('YYYY-MM-DD')
}

/**
 * Converts a UTC ISO timestamp to HH:mm in the user's local timezone.
 * Returns null if input is null/undefined.
 */
export function toLocalTimeString(utcTimestamp: string | null | undefined): string | null {
  if (!utcTimestamp) return null
  return dayjs(utcTimestamp).tz(getUserTimezone()).format('HH:mm')
}

/**
 * Converts a UTC ISO timestamp to YYYY-MM-DD in the user's local timezone.
 * Returns null if input is null/undefined.
 */
export function toLocalDateString(utcTimestamp: string | null | undefined): string | null {
  if (!utcTimestamp) return null
  return dayjs(utcTimestamp).tz(getUserTimezone()).format('YYYY-MM-DD')
}

/**
 * Formats a UTC ISO timestamp for display: "Apr 12, 2026 · 19:30"
 * Returns null if input is null.
 */
export function toLocalDisplayDateTime(utcTimestamp: string | null | undefined): string | null {
  if (!utcTimestamp) return null
  return dayjs(utcTimestamp).tz(getUserTimezone()).format('MMM D, YYYY · HH:mm')
}

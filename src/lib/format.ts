/**
 * Fixed locale so there is no hydration mismatch.
 */
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const RELATIVE = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 24 * 60 * 60 * 1000],
	['month', 30 * 24 * 60 * 60 * 1000],
	['day', 24 * 60 * 60 * 1000],
	['hour', 60 * 60 * 1000],
	['minute', 60 * 1000]
];

export function formatDate(value: Date | null | undefined): string {
	return value ? DATE.format(value) : '—';
}

export function formatRelative(value: Date | null | undefined, now = Date.now()): string {
	if (!value) return 'never';

	const elapsed = value.getTime() - now;

	for (const [unit, size] of UNITS) {
		if (Math.abs(elapsed) >= size) return RELATIVE.format(Math.round(elapsed / size), unit);
	}

	return 'just now';
}

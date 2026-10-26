import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Mark({ size = 28 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
			<rect x="5" y="8" width="21" height="27" rx="5" fill="currentColor" opacity=".32" />
			<rect x="14" y="4" width="21" height="28" rx="5" fill="currentColor" />
			<path d="M20 12h9M20 17h9M20 22h5" stroke="var(--chrome)" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

export function IconButton({ label, children, active, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode; active?: boolean }) {
	return (
		<button type="button" className={`icon-button${active ? ' active' : ''}`} title={label} aria-label={label} aria-pressed={active} {...props}>
			{children}
		</button>
	);
}

export function formatSize(bytes: number): string {
	return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

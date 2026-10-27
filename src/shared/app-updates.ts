export const updateRepository = { provider: 'github', owner: 'svn-box', repo: 'diffolio' } as const;
export const releasesUrl = `https://github.com/${updateRepository.owner}/${updateRepository.repo}/releases`;
export type AppUpdateAction = 'status' | 'check' | 'download' | 'install' | 'release';

export interface AppUpdateState {
	phase: 'disabled' | 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error';
	currentVersion: string;
	revision: number;
	version?: string;
	percent?: number;
	message?: string;
	blocked?: boolean;
}

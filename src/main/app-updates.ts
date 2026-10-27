import type { AppUpdater } from 'electron-updater';
import type { AppUpdateAction, AppUpdateState } from '../shared/app-updates';

type UpdateClient = Pick<AppUpdater, 'checkForUpdates' | 'downloadUpdate' | 'quitAndInstall'> & {
	on(event: 'checking-for-update' | 'update-not-available' | 'update-downloaded' | 'error', listener: () => void): unknown;
	on(event: 'update-available', listener: (info: { version: string }) => void): unknown;
	on(event: 'download-progress', listener: (progress: { percent: number }) => void): unknown;
};

interface UpdateOptions {
	client: UpdateClient;
	version: string;
	disabledReason?: string;
	blockedReason(): string | undefined;
	beforeInstall(): Promise<void>;
	onChange(state: AppUpdateState): void;
}

class UpdateBlockedError extends Error {}

export class AppUpdates {
	private state: AppUpdateState;
	private pending?: Promise<AppUpdateState>;
	private options: UpdateOptions;

	constructor(options: UpdateOptions) {
		this.options = options;
		this.state = { phase: options.disabledReason ? 'disabled' : 'idle', currentVersion: options.version, revision: 0, message: options.disabledReason };
		options.client.on('checking-for-update', () => this.set({ phase: 'checking', version: undefined, percent: undefined, message: undefined }));
		options.client.on('update-not-available', () => this.set({ phase: 'current', version: undefined, message: undefined }));
		options.client.on('update-available', (info: { version: string }) => {
			if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(info.version)) {
				this.fail();
				return;
			}
			const next = info.version.split('.').map(BigInt);
			const current = options.version.split('.').map(BigInt);
			const different = next.findIndex((part, index) => part !== current[index]);
			if (different < 0 || next[different] < current[different]) {
				this.set({ phase: 'current', version: undefined, message: undefined });
				return;
			}
			this.set({ phase: 'available', version: info.version, message: undefined });
		});
		options.client.on('download-progress', (progress: { percent: number }) => {
			if (this.state.phase === 'downloading') {
				this.set({ percent: Number.isFinite(progress.percent) ? Math.max(0, Math.min(100, progress.percent)) : 0 });
			}
		});
		options.client.on('update-downloaded', () => this.set({ phase: 'downloaded', percent: 100, message: undefined }));
		options.client.on('error', () => this.fail());
	}

	getState(): AppUpdateState {
		return { ...this.state };
	}

	act(action: Exclude<AppUpdateAction, 'release'>): Promise<AppUpdateState> {
		if (action === 'status' || this.options.disabledReason) {
			return Promise.resolve(this.getState());
		}
		if (this.pending) {
			return this.pending;
		}
		if (action === 'install') {
			if (this.state.phase !== 'downloaded') {
				return Promise.resolve(this.getState());
			}
			return this.run(async () => {
				this.checkIdle();
				this.set({ phase: 'installing', message: undefined, blocked: false });
				await this.options.beforeInstall();
				this.checkIdle();
				this.options.client.quitAndInstall();
			});
		}
		if (['downloaded', 'installing'].includes(this.state.phase)) {
			return Promise.resolve(this.getState());
		}
		if (action === 'download') {
			if (!this.state.version || !['available', 'error'].includes(this.state.phase)) {
				return Promise.resolve(this.getState());
			}
			return this.run(async () => {
				this.set({ phase: 'downloading', percent: 0, message: undefined });
				await this.options.client.downloadUpdate();
			});
		}
		return this.run(async () => {
			this.set({ phase: 'checking', version: undefined, percent: undefined, message: undefined });
			await this.options.client.checkForUpdates();
		});
	}

	private set(patch: Partial<AppUpdateState>): void {
		if (!this.options.disabledReason) {
			this.state = { ...this.state, ...patch, revision: this.state.revision + 1 };
			this.options.onChange(this.getState());
		}
	}

	private checkIdle(): void {
		const reason = this.options.blockedReason();
		if (reason) {
			throw new UpdateBlockedError(reason);
		}
	}

	private fail(reason?: unknown): void {
		const installing = ['downloaded', 'installing'].includes(this.state.phase);
		const message =
			reason instanceof UpdateBlockedError
				? reason.message
				: installing
					? '安装未完成，请重试或从发布页下载安装。'
					: this.state.version
						? '更新下载或校验失败，请重试。'
						: '暂时无法检查更新，请检查网络后重试，或前往发布页下载。';
		this.set({ phase: installing ? 'downloaded' : 'error', message, blocked: reason instanceof UpdateBlockedError });
	}

	private run(work: () => Promise<void>): Promise<AppUpdateState> {
		// Acquire the lock before invoking a client that may emit events synchronously.
		this.pending = Promise.resolve()
			.then(work)
			.catch((reason: unknown) => this.fail(reason))
			.then(() => this.getState())
			.finally(() => {
				this.pending = undefined;
			});
		return this.pending;
	}
}

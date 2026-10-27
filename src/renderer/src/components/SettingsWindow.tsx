import { useEffect, useState } from 'react';
import { Moon, RefreshCw, Settings, Sun, TextCursorInput } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useWorkspace, workspaceStore } from '@/state/workspace';
import { Combobox } from '@/components/ui/combobox';

const tabs = [
	{ id: 'general', label: '通用', icon: Settings },
	{ id: 'text', label: '文本', icon: TextCursorInput },
] as const;

export function SettingsWindow() {
	const [tab, setTab] = useState<'general' | 'text'>('general');
	const preferences = useWorkspace((state) => state.preferences);
	const error = useWorkspace((state) => state.error);
	const { setPreference, fail } = workspaceStore.getState();
	useEffect(() => {
		const sync = () => {
			document.documentElement.dataset.appearance = workspaceStore.getState().preferences.appearance;
		};
		const unsubscribe = workspaceStore.subscribe(sync);
		const offPreferences = window.diffolio.onPreferences((preferences) => workspaceStore.setState({ preferences }));
		const close = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !event.defaultPrevented) {
				if (isTauri()) {
					void getCurrentWindow().close().catch(fail);
				} else {
					window.close();
				}
			}
		};
		sync();
		void workspaceStore.getState().initialize();
		window.addEventListener('keydown', close);
		return () => {
			unsubscribe();
			offPreferences();
			window.removeEventListener('keydown', close);
		};
	}, [fail]);
	return (
		<div className="settings-window" aria-label="设置">
			<header className="settings-toolbar">
				<div className="settings-window-title" data-tauri-drag-region>
					{tabs.find((item) => item.id === tab)?.label}
				</div>
				<div className="settings-tabs" role="tablist" aria-label="设置分类">
					{tabs.map(({ id, label, icon: Icon }, index) => (
						<button
							key={id}
							id={`settings-tab-${id}`}
							role="tab"
							aria-selected={tab === id}
							aria-controls={`settings-panel-${id}`}
							tabIndex={tab === id ? 0 : -1}
							onClick={() => setTab(id)}
							onKeyDown={(event) => {
								if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
									event.preventDefault();
									const next =
										event.key === 'Home'
											? 0
											: event.key === 'End'
												? tabs.length - 1
												: (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
									setTab(tabs[next].id);
									document.getElementById(`settings-tab-${tabs[next].id}`)?.focus();
								}
							}}
						>
							<Icon size={25} strokeWidth={1.6} />
							{label}
						</button>
					))}
				</div>
			</header>
			<main className="settings-content" role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`} tabIndex={0}>
				{tab === 'general' ? (
					<>
						<div className="preference-row appearance-row">
							<span id="appearance-label" className="preference-label">
								外观：
							</span>
							<div className="appearance-options" role="group" aria-labelledby="appearance-label">
								{(['system', 'light', 'dark'] as const).map((value) => (
									<button
										key={value}
										className={`appearance-choice ${value} ${preferences.appearance === value ? 'selected' : ''}`}
										aria-pressed={preferences.appearance === value}
										onClick={() => void setPreference({ appearance: value })}
									>
										<span className="theme-preview" aria-hidden="true" />
										<span>
											{value === 'system' ? (
												'跟随系统'
											) : value === 'light' ? (
												<>
													<Sun size={12} />
													浅色
												</>
											) : (
												<>
													<Moon size={12} />
													深色
												</>
											)}
										</span>
									</button>
								))}
							</div>
						</div>
						<div className="preference-row settings-update-row">
							<span className="preference-label">软件更新：</span>
							<div className="settings-update-actions">
								<span>
									<RefreshCw size={15} />
									手动检查
								</span>
								<button className="subtle-button" onClick={() => void window.diffolio.showUpdates().catch(fail)}>
									查看更新…
								</button>
							</div>
						</div>
					</>
				) : (
					<>
						<div className="preference-row">
							<span className="preference-label">编辑器字号：</span>
							<Combobox
								label="编辑器字号"
								value={String(preferences.fontSize)}
								onValueChange={(value) => void setPreference({ fontSize: Number(value) })}
								options={[11, 12, 13, 14, 15, 16, 18, 20].map((size) => ({ value: String(size), label: `${size} px` }))}
							/>
						</div>
						<pre className="settings-font-preview" aria-label="字号预览" style={{ fontSize: preferences.fontSize }}>
							<code>
								<span>export const</span>
								{' preferences = {\n  fontSize: '}
								{preferences.fontSize}
								{',\n};'}
							</code>
						</pre>
					</>
				)}
				{error && (
					<p className="settings-error" role="alert">
						{error}
					</p>
				)}
			</main>
		</div>
	);
}

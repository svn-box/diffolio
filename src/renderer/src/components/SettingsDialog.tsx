import { useEffect, useRef } from 'react';
import { X, Sun, Moon } from 'lucide-react';
import { useWorkspace, workspaceStore } from '@/state/workspace';
import { IconButton, Mark } from '@/components/Primitives';
import { Combobox } from '@/components/ui/combobox';
import { version } from '../../../../package.json';
import { AppUpdateSection } from '@/components/AppUpdateSection';

export function SettingsDialog() {
	const dialog = useRef<HTMLDialogElement>(null);
	const settings = useWorkspace((state) => state.settings);
	const preferences = useWorkspace((state) => state.preferences);
	const { setSettings, setPreference } = workspaceStore.getState();
	useEffect(() => {
		if (settings) {
			dialog.current?.showModal();
		} else {
			dialog.current?.close();
		}
	}, [settings]);
	return (
		<dialog
			ref={dialog}
			className="settings-dialog"
			onCancel={() => setSettings(false)}
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					setSettings(false);
				}
			}}
		>
			<div className="settings-title">
				<h2>设置</h2>
				<IconButton label="关闭设置" onClick={() => setSettings(false)}>
					<X size={17} />
				</IconButton>
			</div>
			<section>
				<h3>外观</h3>
				<p>让工作区适应你的环境。</p>
				<div className="appearance-options">
					{(['system', 'light', 'dark'] as const).map((value) => (
						<button
							key={value}
							className={`appearance-choice ${value} ${preferences.appearance === value ? 'selected' : ''}`}
							aria-pressed={preferences.appearance === value}
							onClick={() => void setPreference({ appearance: value })}
						>
							<span className="theme-preview">
								<i />
								<i />
								<i />
							</span>
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
						</button>
					))}
				</div>
			</section>
			<section>
				<h3>文本显示</h3>
				<div className="setting-row">
					<span>编辑器字号</span>
					<Combobox
						label="编辑器字号"
						value={String(preferences.fontSize)}
						onValueChange={(value) => void setPreference({ fontSize: Number(value) })}
						options={[11, 12, 13, 14, 15, 16, 18, 20].map((size) => ({ value: String(size), label: `${size} px` }))}
						container={dialog.current}
					/>
				</div>
				<label className="setting-row">
					自动换行
					<input type="checkbox" checked={preferences.wrap} onChange={(event) => void setPreference({ wrap: event.target.checked })} />
				</label>
				<label className="setting-row">
					折叠不变区域
					<input type="checkbox" checked={preferences.collapse} onChange={(event) => void setPreference({ collapse: event.target.checked })} />
				</label>
			</section>
			<AppUpdateSection />
			<div className="settings-footer">
				<Mark size={22} />
				<span>
					Diffolio <small>{version}</small>
				</span>
				<span>为专注的比较而设计</span>
			</div>
		</dialog>
	);
}

import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { workspaceStore } from '@/state/workspace';
import { activeSession } from '@/state/workspace-state';

interface NativeDrop {
	type: 'enter' | 'over' | 'drop' | 'leave';
	paths?: string[];
	position?: { x: number; y: number };
}

export function handleNativeDrop(payload: NativeDrop): void {
	const state = workspaceStore.getState();
	const dragging = payload.type === 'enter' || payload.type === 'over';
	window.dispatchEvent(new CustomEvent('diffolio-drag', { detail: dragging && !state.busy }));
	document.querySelectorAll<HTMLElement>('.input-target').forEach((target) => delete target.dataset.dragover);
	if (payload.type === 'leave' || state.busy) {
		return;
	}
	const point = payload.position;
	const target = point
		? document
				.elementsFromPoint(point.x / devicePixelRatio, point.y / devicePixelRatio)
				.map((element) => element.closest<HTMLElement>('.input-target'))
				.find(Boolean)
		: undefined;
	if (target && dragging) {
		target.dataset.dragover = 'true';
	}
	if (payload.type !== 'drop' || !payload.paths?.length) {
		return;
	}
	const side = target?.dataset.side;
	if ((side === 'a' || side === 'b') && payload.paths.length === 1) {
		if (activeSession(state).entryKind === 'folders') {
			void state.selectFolder(side, payload.paths[0]);
		} else {
			void state.load('paths', payload.paths, side);
		}
	} else {
		void state.load('paths', payload.paths);
	}
}

export async function installInteractions(): Promise<void> {
	if (!isTauri()) {
		return;
	}
	await getCurrentWebview().onDragDropEvent(({ payload }) => handleNativeDrop(payload));
	document.addEventListener('mousedown', (event) => {
		if (event.button !== 0 || event.detail > 1 || !(event.target instanceof Element)) {
			return;
		}
		if (event.target.closest('.titlebar') && !event.target.closest('button, input, select, a, [role="button"], [role="tab"]')) {
			void getCurrentWindow().startDragging();
		}
	});
	document.addEventListener('dblclick', (event) => {
		if (event.target instanceof Element && event.target.closest('.titlebar') && !event.target.closest('button, input, select, a')) {
			void getCurrentWindow().toggleMaximize();
		}
	});
}

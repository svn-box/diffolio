// These callbacks run inside Playwright's Electron main-process context.
export async function backupClipboard({ clipboard, ClipboardItem }, key) {
	const snapshot = [];
	for (const item of await clipboard.read()) {
		const types = [...item.types];
		// An empty macOS pasteboard can expose an entry with no MIME types.
		if (!types.length) {
			continue;
		}
		const values = await Promise.all(types.map(async (type) => [type, await item.getType(type)]));
		snapshot.push(new ClipboardItem(Object.fromEntries(values)));
	}
	globalThis[key] = snapshot;
}

export async function restoreClipboard({ clipboard }, key) {
	const snapshot = globalThis[key];
	if (snapshot === undefined) {
		return;
	}
	if (snapshot.length) {
		await clipboard.write(snapshot);
	} else {
		clipboard.clear();
	}
	delete globalThis[key];
}

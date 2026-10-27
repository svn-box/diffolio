import React from 'react';
import { createRoot } from 'react-dom/client';
import { installDesktop } from '@/desktop/api';
import '@/styles.css';

await installDesktop();
const settings = new URLSearchParams(location.search).get('window') === 'settings';
const App = settings ? (await import('@/components/SettingsWindow')).SettingsWindow : (await import('@/App')).App;
if (!settings) {
	const { installInteractions } = await import('@/desktop/interactions');
	await installInteractions();
}

createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

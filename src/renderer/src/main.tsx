import React from 'react';
import { createRoot } from 'react-dom/client';
import { installDesktop } from '@/desktop/api';
import '@/styles.css';

await installDesktop();
const { App } = await import('@/App');
const { installInteractions } = await import('@/desktop/interactions');
await installInteractions();

createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

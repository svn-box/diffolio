import type { DiffolioApi } from '../../shared/types';

declare global {
	interface Window {
		diffolio: DiffolioApi;
	}
}

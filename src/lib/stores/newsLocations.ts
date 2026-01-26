import { writable, derived } from 'svelte/store';

export interface NewsLocation {
	id: string;
	name: string;
	lat: number;
	lon: number;
	newsCount: number;
	headlines: string[];
	level: 'critical' | 'high' | 'elevated' | 'low';
	lastUpdated: number;
}

export interface NewsLocationsState {
	locations: NewsLocation[];
	loading: boolean;
	error: string | null;
	lastExtracted: number | null;
}

function createNewsLocationsStore() {
	const { subscribe, set, update } = writable<NewsLocationsState>({
		locations: [],
		loading: false,
		error: null,
		lastExtracted: null
	});

	return {
		subscribe,
		setLoading(loading: boolean) {
			update((s) => ({ ...s, loading, error: loading ? null : s.error }));
		},
		setError(error: string | null) {
			update((s) => ({ ...s, error, loading: false }));
		},
		setLocations(locations: NewsLocation[]) {
			update((s) => ({
				...s,
				locations,
				loading: false,
				error: null,
				lastExtracted: Date.now()
			}));
		},
		clear() {
			set({
				locations: [],
				loading: false,
				error: null,
				lastExtracted: null
			});
		}
	};
}

export const newsLocations = createNewsLocationsStore();

export const newsLocationsList = derived(newsLocations, ($s) => $s.locations);
export const isExtractingLocations = derived(newsLocations, ($s) => $s.loading);

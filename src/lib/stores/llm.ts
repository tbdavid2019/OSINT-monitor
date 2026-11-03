import { writable } from 'svelte/store';
import { browser } from '$app/env';

const STORAGE_KEY = 'llmSettings';

export interface LLMModel {
	id: string;
	name?: string;
}

export interface LLMSettings {
	baseUrl: string;
	apiKey: string;
	model: string;
	availableModels: LLMModel[];
}

function getEnvDefaults(): Partial<LLMSettings> {
	if (!browser) return {};

	return {
		baseUrl: import.meta.env.VITE_LLM_BASE_URL || undefined,
		apiKey: import.meta.env.VITE_LLM_API_KEY || undefined,
		model: import.meta.env.VITE_LLM_MODEL || undefined
	};
}

const DEFAULT_SETTINGS: LLMSettings = {
	baseUrl: 'https://api.openai.com/v1',
	apiKey: '',
	model: 'gpt-4o-mini',
	availableModels: []
};

function createLLMStore() {
	const { subscribe, set, update } = writable<LLMSettings>(DEFAULT_SETTINGS);

	return {
		subscribe,
		init() {
			if (browser) {
				const envDefaults = getEnvDefaults();
				const stored = localStorage.getItem(STORAGE_KEY);
				let storedSettings: Partial<LLMSettings> = {};

				if (stored) {
					try {
						storedSettings = JSON.parse(stored);
					} catch (e) {
						console.warn('Failed to parse LLM settings:', e);
					}
				}

				const finalSettings: LLMSettings = {
					...DEFAULT_SETTINGS,
					...envDefaults,
					...storedSettings
				};

				if (envDefaults.baseUrl && !storedSettings.baseUrl) {
					finalSettings.baseUrl = envDefaults.baseUrl;
				}
				if (envDefaults.apiKey && !storedSettings.apiKey) {
					finalSettings.apiKey = envDefaults.apiKey;
				}
				if (envDefaults.model && !storedSettings.model) {
					finalSettings.model = envDefaults.model;
				}

				set(finalSettings);
			}
		},
		updateSettings(settings: Partial<LLMSettings>) {
			update((s) => {
				const newSettings = { ...s, ...settings };
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
				}
				return newSettings;
			});
		},
		setModels(models: LLMModel[]) {
			update((s) => {
				const newSettings = { ...s, availableModels: models };
				if (models.length > 0 && !models.find((m) => m.id === s.model)) {
					newSettings.model = models[0].id;
				}
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
				}
				return newSettings;
			});
		}
	};
}

export const llmSettings = createLLMStore();

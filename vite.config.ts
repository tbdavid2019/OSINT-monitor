import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			// Static adapter for deployment to any static host
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: 'app.html',
				precompress: false,
				strict: true
			}),
			paths: { base: process.env.BASE_PATH || '' },
		})
	]
});

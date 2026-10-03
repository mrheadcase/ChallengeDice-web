import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html'
		}),
		paths: {
			// GitHub Pages serves from /ChallengeDice-web; BASE_PATH='' builds for a domain root (dev.challengedice.com)
			base: process.env.BASE_PATH ?? '/ChallengeDice-web'
		},
		prerender: {
			handleHttpError: 'warn'
		}
	}
};

export default config;

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// vitest config — @ts-ignore because vitest bundles its own vite copy
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});

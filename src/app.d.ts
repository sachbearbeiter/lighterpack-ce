// app.d.ts — SvelteKit type augmentation
declare global {
	namespace App {
		interface Locals {
			userId?: string;
			username?: string;
		}
	}
}

export {};

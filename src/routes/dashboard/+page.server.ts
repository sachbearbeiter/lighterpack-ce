import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Das Dashboard liegt unter / (wie im Original). Diese Route leitet nur weiter.
export const load: PageServerLoad = async () => {
throw redirect(301, '/');
};

/**
 * GET /api/library/export-csv/[listId]
 *
 * Exports one list as a lighterpack-compatible CSV file.
 * The file can be re-imported into lighterpack.com without modification.
 */

import { error } from '@sveltejs/kit';
import { exportListAsCsv } from '$lib/server/library.service.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.userId) error(401, 'Not authenticated');

	const result = await exportListAsCsv(params.listId, locals.userId);

	if (!result) error(404, 'List not found');

	return new Response(result.csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${result.filename}.csv"`,
		},
	});
};

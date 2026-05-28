/**
 * POST /api/library/import-csv
 *
 * Accepts a multipart form with a `file` field (lighterpack CSV export).
 * Creates a new list in the authenticated user's library.
 *
 * Response: { listId: string; itemCount: number; skipped: number }
 */

import { error, json } from '@sveltejs/kit';
import { parseImportCsv } from '$lib/csv.js';
import { importCsvToLibrary } from '$lib/server/library.service.js';
import type { RequestHandler } from './$types.js';

const MAX_FILE_SIZE = 5_000_000; // 5 MB

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.userId) error(401, 'Not authenticated');

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File))                   error(400, 'Missing file field');
	if (!file.name.toLowerCase().endsWith('.csv')) error(400, 'Only CSV files are accepted');
	if (file.size > MAX_FILE_SIZE)                 error(400, 'File too large (max 5 MB)');

	const { rows, skipped } = parseImportCsv(await file.text());

	if (rows.length === 0) error(422, 'No valid rows found in CSV');

	// Derive list name from filename: "my_trip_2026.csv" → "my trip 2026"
	const listName = file.name.replace(/\.csv$/i, '').replace(/_/g, ' ') || 'Imported list';

	const result = await importCsvToLibrary(locals.userId, listName, rows);

	return json({ ...result, skipped }, { status: 201 });
};


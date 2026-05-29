import { migrate } from 'drizzle-orm/mysql2/migrator';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const connection = await mysql.createConnection({
	host: process.env.DB_HOST ?? 'localhost',
	port: Number(process.env.DB_PORT ?? 3306),
	user: process.env.DB_USER ?? 'lighterpack',
	password: process.env.DB_PASSWORD ?? 'lighterpack',
	database: process.env.DB_NAME ?? 'lighterpack',
	multipleStatements: true,
});

const db = drizzle(connection);

console.log('Running migrations…');
try {
	await migrate(db, { migrationsFolder: join(__dirname, '../drizzle') });
	console.log('Migrations complete.');
} catch (err: any) {
	// Already applied (table exists) is fine — Drizzle tracks via __drizzle_migrations
	if (err?.sqlMessage?.includes('already exists') || err?.code === 'ER_TABLE_EXISTS_ERROR') {
		console.log('Migrations already applied, skipping.');
	} else {
		throw err;
	}
}

await connection.end();

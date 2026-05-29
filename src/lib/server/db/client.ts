import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } from '$env/static/private';

const pool = mysql.createPool({
	host: DB_HOST ?? 'localhost',
	port: Number(DB_PORT ?? 3306),
	user: DB_USER ?? 'lighterpack',
	password: DB_PASSWORD ?? 'lighterpack',
	database: DB_NAME ?? 'lighterpack',
	waitForConnections: true,
	connectionLimit: 10
});

export const db = drizzle(pool, { schema, mode: 'default' });

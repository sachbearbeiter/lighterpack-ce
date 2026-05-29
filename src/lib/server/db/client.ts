import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import { env } from '$env/dynamic/private';

const pool = mysql.createPool({
	host: env.DB_HOST ?? 'localhost',
	port: Number(env.DB_PORT ?? 3306),
	user: env.DB_USER ?? 'lighterpack',
	password: env.DB_PASSWORD ?? 'lighterpack',
	database: env.DB_NAME ?? 'lighterpack',
	waitForConnections: true,
	connectionLimit: 10
});

export const db = drizzle(pool, { schema, mode: 'default' });

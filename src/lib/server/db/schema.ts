import {
	mysqlTable,
	varchar,
	text,
	int,
	decimal,
	boolean,
	datetime,
	mysqlEnum,
	json,
	index,
	uniqueIndex
} from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// Helper: VARCHAR(32) hex UUID primary key
// ---------------------------------------------------------------------------
const id = () => varchar('id', { length: 32 }).notNull();
const fk = (col: string) => varchar(col, { length: 32 }).notNull();
const legacyId = () => varchar('legacy_id', { length: 64 });

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = mysqlTable(
	'users',
	{
		id: id().primaryKey(),
		username: varchar('username', { length: 32 }).notNull(),
		email: varchar('email', { length: 254 }).notNull(),
		passwordHash: varchar('password_hash', { length: 255 }),
		passwordStatus: mysqlEnum('password_status', ['active', 'must_reset', 'imported_no_password'])
			.notNull()
			.default('active'),
		createdAt: datetime('created_at').notNull(),
		legacyId: legacyId()
	},
	(t) => ({
		usernameIdx: uniqueIndex('users_username_idx').on(t.username),
		emailIdx: uniqueIndex('users_email_idx').on(t.email),
		legacyIdx: uniqueIndex('users_legacy_id_idx').on(t.legacyId)
	})
);

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------
export const sessions = mysqlTable(
	'sessions',
	{
		id: id().primaryKey(),
		userId: fk('user_id'),
		tokenHash: varchar('token_hash', { length: 255 }).notNull(),
		expiresAt: datetime('expires_at').notNull(),
		createdAt: datetime('created_at').notNull()
	},
	(t) => ({
		tokenIdx: uniqueIndex('sessions_token_hash_idx').on(t.tokenHash),
		userIdx: index('sessions_user_id_idx').on(t.userId)
	})
);

// ---------------------------------------------------------------------------
// password_resets
// ---------------------------------------------------------------------------
export const passwordResets = mysqlTable(
	'password_resets',
	{
		id: id().primaryKey(),
		userId: fk('user_id'),
		tokenHash: varchar('token_hash', { length: 255 }).notNull(),
		expiresAt: datetime('expires_at').notNull(),
		usedAt: datetime('used_at'),
		createdAt: datetime('created_at').notNull()
	},
	(t) => ({
		tokenIdx: uniqueIndex('pw_resets_token_hash_idx').on(t.tokenHash),
		userIdx: index('pw_resets_user_id_idx').on(t.userId)
	})
);

// ---------------------------------------------------------------------------
// libraries  (one per user)
// ---------------------------------------------------------------------------
export const libraries = mysqlTable(
	'libraries',
	{
		id: id().primaryKey(),
		userId: fk('user_id'),
		totalUnit: varchar('total_unit', { length: 4 }).notNull().default('oz'),
		itemUnit: varchar('item_unit', { length: 4 }).notNull().default('oz'),
		currencySymbol: varchar('currency_symbol', { length: 4 }).notNull().default('$'),
		optionalFields: json('optional_fields'),   // {worn, consumable, price, images, listDescription}
		version: int('version').notNull().default(0), // optimistic concurrency
		updatedAt: datetime('updated_at').notNull(),
		legacyId: legacyId()
	},
	(t) => ({
		userIdx: uniqueIndex('libraries_user_id_idx').on(t.userId),
		legacyIdx: uniqueIndex('libraries_legacy_id_idx').on(t.legacyId)
	})
);

// ---------------------------------------------------------------------------
// items
// ---------------------------------------------------------------------------
export const items = mysqlTable(
	'items',
	{
		id: id().primaryKey(),
		libraryId: fk('library_id'),
		name: varchar('name', { length: 512 }).notNull().default(''),
		description: text('description'),
		weightMg: int('weight_mg').notNull().default(0),   // milligrams, source of truth
		authorUnit: varchar('author_unit', { length: 4 }).notNull().default('oz'),
		price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
		url: varchar('url', { length: 2048 }),
		image: varchar('image', { length: 2048 }),
		imageUrl: varchar('image_url', { length: 2048 }),
		legacyId: legacyId()
	},
	(t) => ({
		libraryIdx: index('items_library_id_idx').on(t.libraryId),
		legacyIdx: uniqueIndex('items_legacy_id_idx').on(t.legacyId)
	})
);

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------
export const categories = mysqlTable(
	'categories',
	{
		id: id().primaryKey(),
		libraryId: fk('library_id'),
		name: varchar('name', { length: 512 }).notNull().default(''),
		color: json('color'),   // {r, g, b}
		sortOrder: int('sort_order').notNull().default(0),
		legacyId: legacyId()
	},
	(t) => ({
		libraryIdx: index('categories_library_id_idx').on(t.libraryId),
		legacyIdx: uniqueIndex('categories_legacy_id_idx').on(t.legacyId)
	})
);

// ---------------------------------------------------------------------------
// category_items  (m:n between categories and items, with payload)
// ---------------------------------------------------------------------------
export const categoryItems = mysqlTable(
	'category_items',
	{
		id: id().primaryKey(),
		categoryId: fk('category_id'),
		itemId: fk('item_id'),
		qty: int('qty').notNull().default(1),
		worn: boolean('worn').notNull().default(false),
		consumable: boolean('consumable').notNull().default(false),
		star: int('star').notNull().default(0),
		sortOrder: int('sort_order').notNull().default(0)
	},
	(t) => ({
		categoryIdx: index('cat_items_category_id_idx').on(t.categoryId),
		itemIdx: index('cat_items_item_id_idx').on(t.itemId)
	})
);

// ---------------------------------------------------------------------------
// lists
// ---------------------------------------------------------------------------
export const lists = mysqlTable(
	'lists',
	{
		id: id().primaryKey(),
		libraryId: fk('library_id'),
		name: varchar('name', { length: 512 }).notNull().default(''),
		externalId: varchar('external_id', { length: 32 }),
		description: text('description'),
		isPublic: boolean('is_public').notNull().default(false),
		sortOrder: int('sort_order').notNull().default(0),
		style: json('style'),   // chart prefs etc.
		legacyId: legacyId()
	},
	(t) => ({
		libraryIdx: index('lists_library_id_idx').on(t.libraryId),
		externalIdx: uniqueIndex('lists_external_id_idx').on(t.externalId),
		legacyIdx: uniqueIndex('lists_legacy_id_idx').on(t.legacyId)
	})
);

// ---------------------------------------------------------------------------
// list_categories  (ordered join between lists and categories)
// ---------------------------------------------------------------------------
export const listCategories = mysqlTable(
	'list_categories',
	{
		id: id().primaryKey(),
		listId: fk('list_id'),
		categoryId: fk('category_id'),
		sortOrder: int('sort_order').notNull().default(0)
	},
	(t) => ({
		listIdx: index('list_categories_list_id_idx').on(t.listId),
		categoryIdx: index('list_categories_category_id_idx').on(t.categoryId)
	})
);

// ---------------------------------------------------------------------------
// import_log
// ---------------------------------------------------------------------------
export const importLog = mysqlTable('import_log', {
	id: id().primaryKey(),
	sourceIdentifier: varchar('source_identifier', { length: 255 }).notNull(),
	startedAt: datetime('started_at').notNull(),
	finishedAt: datetime('finished_at'),
	status: mysqlEnum('status', ['running', 'success', 'partial', 'failed']).notNull().default('running'),
	usersTotal: int('users_total').notNull().default(0),
	usersOk: int('users_ok').notNull().default(0),
	usersFailed: int('users_failed').notNull().default(0),
	errorLog: text('error_log')
});

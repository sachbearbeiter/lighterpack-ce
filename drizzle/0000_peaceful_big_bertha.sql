CREATE TABLE `categories` (
	`id` varchar(32) NOT NULL,
	`library_id` varchar(32) NOT NULL,
	`name` varchar(512) NOT NULL DEFAULT '',
	`color` json,
	`sort_order` int NOT NULL DEFAULT 0,
	`legacy_id` varchar(64),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_legacy_id_idx` UNIQUE(`legacy_id`)
);
--> statement-breakpoint
CREATE TABLE `category_items` (
	`id` varchar(32) NOT NULL,
	`category_id` varchar(32) NOT NULL,
	`item_id` varchar(32) NOT NULL,
	`qty` int NOT NULL DEFAULT 1,
	`worn` boolean NOT NULL DEFAULT false,
	`consumable` boolean NOT NULL DEFAULT false,
	`star` int NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `category_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `import_log` (
	`id` varchar(32) NOT NULL,
	`source_identifier` varchar(255) NOT NULL,
	`started_at` datetime NOT NULL,
	`finished_at` datetime,
	`status` enum('running','success','partial','failed') NOT NULL DEFAULT 'running',
	`users_total` int NOT NULL DEFAULT 0,
	`users_ok` int NOT NULL DEFAULT 0,
	`users_failed` int NOT NULL DEFAULT 0,
	`error_log` text,
	CONSTRAINT `import_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` varchar(32) NOT NULL,
	`library_id` varchar(32) NOT NULL,
	`name` varchar(512) NOT NULL DEFAULT '',
	`description` text,
	`weight_mg` int NOT NULL DEFAULT 0,
	`author_unit` varchar(4) NOT NULL DEFAULT 'oz',
	`price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`url` varchar(2048),
	`image` varchar(2048),
	`image_url` varchar(2048),
	`legacy_id` varchar(64),
	CONSTRAINT `items_id` PRIMARY KEY(`id`),
	CONSTRAINT `items_legacy_id_idx` UNIQUE(`legacy_id`)
);
--> statement-breakpoint
CREATE TABLE `libraries` (
	`id` varchar(32) NOT NULL,
	`user_id` varchar(32) NOT NULL,
	`total_unit` varchar(4) NOT NULL DEFAULT 'oz',
	`item_unit` varchar(4) NOT NULL DEFAULT 'oz',
	`currency_symbol` varchar(4) NOT NULL DEFAULT '$',
	`optional_fields` json,
	`version` int NOT NULL DEFAULT 0,
	`updated_at` datetime NOT NULL,
	`legacy_id` varchar(64),
	CONSTRAINT `libraries_id` PRIMARY KEY(`id`),
	CONSTRAINT `libraries_user_id_idx` UNIQUE(`user_id`),
	CONSTRAINT `libraries_legacy_id_idx` UNIQUE(`legacy_id`)
);
--> statement-breakpoint
CREATE TABLE `list_categories` (
	`id` varchar(32) NOT NULL,
	`list_id` varchar(32) NOT NULL,
	`category_id` varchar(32) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `list_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` varchar(32) NOT NULL,
	`library_id` varchar(32) NOT NULL,
	`name` varchar(512) NOT NULL DEFAULT '',
	`external_id` varchar(32),
	`description` text,
	`is_public` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`style` json,
	`legacy_id` varchar(64),
	CONSTRAINT `lists_id` PRIMARY KEY(`id`),
	CONSTRAINT `lists_external_id_idx` UNIQUE(`external_id`),
	CONSTRAINT `lists_legacy_id_idx` UNIQUE(`legacy_id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` varchar(32) NOT NULL,
	`user_id` varchar(32) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `pw_resets_token_hash_idx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(32) NOT NULL,
	`user_id` varchar(32) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_hash_idx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(32) NOT NULL,
	`username` varchar(32) NOT NULL,
	`email` varchar(254) NOT NULL,
	`password_hash` varchar(255),
	`password_status` enum('active','must_reset','imported_no_password') NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL,
	`legacy_id` varchar(64),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_idx` UNIQUE(`username`),
	CONSTRAINT `users_email_idx` UNIQUE(`email`),
	CONSTRAINT `users_legacy_id_idx` UNIQUE(`legacy_id`)
);
--> statement-breakpoint
CREATE INDEX `categories_library_id_idx` ON `categories` (`library_id`);--> statement-breakpoint
CREATE INDEX `cat_items_category_id_idx` ON `category_items` (`category_id`);--> statement-breakpoint
CREATE INDEX `cat_items_item_id_idx` ON `category_items` (`item_id`);--> statement-breakpoint
CREATE INDEX `items_library_id_idx` ON `items` (`library_id`);--> statement-breakpoint
CREATE INDEX `list_categories_list_id_idx` ON `list_categories` (`list_id`);--> statement-breakpoint
CREATE INDEX `list_categories_category_id_idx` ON `list_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `lists_library_id_idx` ON `lists` (`library_id`);--> statement-breakpoint
CREATE INDEX `pw_resets_user_id_idx` ON `password_resets` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);

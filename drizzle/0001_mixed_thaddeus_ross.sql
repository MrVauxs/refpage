CREATE TABLE `access_key` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`lookup` text NOT NULL,
	`hash` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_key_lookup_unique` ON `access_key` (`lookup`);--> statement-breakpoint
CREATE TABLE `access_key_character` (
	`access_key_id` text NOT NULL,
	`character_id` text NOT NULL,
	PRIMARY KEY(`access_key_id`, `character_id`),
	FOREIGN KEY (`access_key_id`) REFERENCES `access_key`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `access_key_character_characterId_idx` ON `access_key_character` (`character_id`);--> statement-breakpoint
CREATE TABLE `character` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`summary` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_slug_unique` ON `character` (`slug`);
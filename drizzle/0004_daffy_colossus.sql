CREATE TABLE `reference_image` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`file_key` text NOT NULL,
	`title` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reference_image_file_key_unique` ON `reference_image` (`file_key`);--> statement-breakpoint
CREATE INDEX `reference_image_characterId_idx` ON `reference_image` (`character_id`);--> statement-breakpoint
CREATE TABLE `reference_image_tag` (
	`image_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`image_id`, `tag_id`),
	FOREIGN KEY (`image_id`) REFERENCES `reference_image`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reference_image_tag_tagId_idx` ON `reference_image_tag` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_name_unique` ON `tag` (`name`);
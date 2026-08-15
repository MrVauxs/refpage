CREATE TABLE `allowed_email` (
	`id` text PRIMARY KEY NOT NULL,
	`entry` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `allowed_email_entry_unique` ON `allowed_email` (`entry`);
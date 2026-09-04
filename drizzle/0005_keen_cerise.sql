ALTER TABLE `reference_image` RENAME COLUMN "title" TO "description";--> statement-breakpoint
DELETE FROM `access_key`;--> statement-breakpoint
ALTER TABLE `access_key` ADD `password` text NOT NULL;

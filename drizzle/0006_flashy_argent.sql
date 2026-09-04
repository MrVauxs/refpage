ALTER TABLE `reference_image` ADD `variant_of_id` text REFERENCES reference_image(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `reference_image_variantOfId_idx` ON `reference_image` (`variant_of_id`);

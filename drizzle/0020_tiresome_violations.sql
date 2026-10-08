ALTER TABLE `projects` ADD `target_market` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `target_language` text;--> statement-breakpoint
ALTER TABLE `publish_metrics` ADD `market` text;--> statement-breakpoint
ALTER TABLE `publish_metrics` ADD `language` text;--> statement-breakpoint
ALTER TABLE `publish_metrics` ADD `clicks` integer DEFAULT 0 NOT NULL;
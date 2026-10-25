ALTER TABLE `StoryScene` ADD COLUMN `timelineEventId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `StoryScene_timelineEventId_key` ON `StoryScene`(`timelineEventId`);
ALTER TABLE `StoryScene` ADD CONSTRAINT `StoryScene_timelineEventId_fkey` FOREIGN KEY (`timelineEventId`) REFERENCES `TimelineEvent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `StoryScene`
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `locationId` VARCHAR(191) NULL,
  ADD INDEX `StoryScene_locationId_idx` (`locationId`),
  ADD CONSTRAINT `StoryScene_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `_NPCToStoryScene` (
  `A` VARCHAR(191) NOT NULL,
  `B` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `_NPCToStoryScene_AB_unique` (`A`, `B`),
  INDEX `_NPCToStoryScene_B_index` (`B`),
  CONSTRAINT `_NPCToStoryScene_A_fkey` FOREIGN KEY (`A`) REFERENCES `NPC`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `_NPCToStoryScene_B_fkey` FOREIGN KEY (`B`) REFERENCES `StoryScene`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

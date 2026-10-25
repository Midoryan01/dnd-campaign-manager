ALTER TABLE `SessionNote`
  ADD COLUMN `storySceneId` VARCHAR(191) NULL,
  ADD COLUMN `locationId` VARCHAR(191) NULL,
  ADD COLUMN `questId` VARCHAR(191) NULL,
  ADD INDEX `SessionNote_storySceneId_idx` (`storySceneId`),
  ADD INDEX `SessionNote_locationId_idx` (`locationId`),
  ADD INDEX `SessionNote_questId_idx` (`questId`),
  ADD CONSTRAINT `SessionNote_storySceneId_fkey` FOREIGN KEY (`storySceneId`) REFERENCES `StoryScene` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `SessionNote_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `SessionNote_questId_fkey` FOREIGN KEY (`questId`) REFERENCES `Quest` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `_QuestToStoryScene` (
  `A` VARCHAR(191) NOT NULL,
  `B` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `_QuestToStoryScene_AB_unique` (`A`, `B`),
  INDEX `_QuestToStoryScene_B_index` (`B`),
  CONSTRAINT `_QuestToStoryScene_A_fkey` FOREIGN KEY (`A`) REFERENCES `Quest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `_QuestToStoryScene_B_fkey` FOREIGN KEY (`B`) REFERENCES `StoryScene` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

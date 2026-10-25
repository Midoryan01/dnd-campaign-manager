CREATE TABLE `_CombatToStoryScene` (
  `A` VARCHAR(191) NOT NULL,
  `B` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `_CombatToStoryScene_AB_unique`(`A`, `B`),
  INDEX `_CombatToStoryScene_B_index`(`B`),
  CONSTRAINT `_CombatToStoryScene_A_fkey` FOREIGN KEY (`A`) REFERENCES `Combat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `_CombatToStoryScene_B_fkey` FOREIGN KEY (`B`) REFERENCES `StoryScene`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
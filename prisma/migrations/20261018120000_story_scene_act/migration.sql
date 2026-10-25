ALTER TABLE `StoryScene`
  ADD COLUMN `actId` VARCHAR(191) NULL,
  ADD INDEX `StoryScene_actId_status_sortOrder_idx` (`actId`, `status`, `sortOrder`),
  ADD CONSTRAINT `StoryScene_actId_fkey` FOREIGN KEY (`actId`) REFERENCES `StoryNote` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

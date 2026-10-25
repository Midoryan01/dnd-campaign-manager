CREATE TABLE `CampaignAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `summary` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CampaignAuditLog_campaignId_createdAt_idx` (`campaignId`, `createdAt`),
  INDEX `CampaignAuditLog_entityType_entityId_idx` (`entityType`, `entityId`),
  INDEX `CampaignAuditLog_actorId_idx` (`actorId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CampaignAuditLog_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CampaignAuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
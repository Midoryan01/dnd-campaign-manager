CREATE TABLE `Shop` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NULL,
  `proprietorId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `isOpen` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Shop_campaignId_name_idx` (`campaignId`, `name`),
  INDEX `Shop_locationId_idx` (`locationId`),
  INDEX `Shop_proprietorId_idx` (`proprietorId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Shop_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Shop_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Shop_proprietorId_fkey` FOREIGN KEY (`proprietorId`) REFERENCES `NPC` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShopItem` (
  `id` VARCHAR(191) NOT NULL,
  `shopId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `priceCopper` INTEGER NOT NULL,
  `stock` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ShopItem_shopId_name_idx` (`shopId`, `name`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ShopItem_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `Shop` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShopTransaction` (
  `id` VARCHAR(191) NOT NULL,
  `shopId` VARCHAR(191) NOT NULL,
  `itemId` VARCHAR(191) NULL,
  `itemName` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `unitPriceCopper` INTEGER NOT NULL,
  `buyer` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ShopTransaction_shopId_createdAt_idx` (`shopId`, `createdAt`),
  INDEX `ShopTransaction_itemId_idx` (`itemId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ShopTransaction_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `Shop` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ShopTransaction_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ShopItem` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

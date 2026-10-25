ALTER TABLE `Location`
  ADD COLUMN `type` ENUM('WORLD','REGION','CITY','VILLAGE','DISTRICT','BUILDING','FOREST','MOUNTAIN','CAVE','DUNGEON','ROOM','OTHER') NOT NULL DEFAULT 'OTHER',
  ADD COLUMN `dmNotes` TEXT NULL,
  ADD COLUMN `imageUrl` TEXT NULL,
  ADD INDEX `Location_campaignId_parentId_idx` (`campaignId`, `parentId`);

ALTER TABLE `GameMap`
  ADD COLUMN `mapType` ENUM('WORLD','REGION','CITY','DUNGEON','BATTLEMAP','OTHER') NOT NULL DEFAULT 'OTHER',
  ADD COLUMN `relatedLocationId` VARCHAR(191) NULL,
  ADD COLUMN `description` TEXT NULL,
  ADD INDEX `GameMap_relatedLocationId_idx` (`relatedLocationId`),
  ADD CONSTRAINT `GameMap_relatedLocationId_fkey` FOREIGN KEY (`relatedLocationId`) REFERENCES `Location` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MapToken`
  ADD COLUMN `locationId` VARCHAR(191) NULL,
  ADD COLUMN `label` VARCHAR(191) NULL,
  ADD COLUMN `visibility` ENUM('PUBLIC','DM_ONLY','PLAYER_VISIBLE','SELECTED_USERS') NOT NULL DEFAULT 'DM_ONLY',
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD INDEX `MapToken_locationId_idx` (`locationId`),
  ADD INDEX `MapToken_mapId_visibility_idx` (`mapId`, `visibility`),
  ADD CONSTRAINT `MapToken_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

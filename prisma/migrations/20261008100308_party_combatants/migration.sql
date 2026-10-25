-- AlterTable
ALTER TABLE `combatant` ADD COLUMN `monsterId` VARCHAR(191) NULL,
    ADD COLUMN `npcId` VARCHAR(191) NULL,
    ADD COLUMN `partyMemberId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PartyMember` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `playerName` VARCHAR(191) NULL,
    `species` VARCHAR(191) NULL,
    `className` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `background` VARCHAR(191) NULL,
    `currentHp` INTEGER NOT NULL DEFAULT 1,
    `maxHp` INTEGER NOT NULL DEFAULT 1,
    `tempHp` INTEGER NOT NULL DEFAULT 0,
    `ac` INTEGER NOT NULL DEFAULT 10,
    `initiativeBonus` INTEGER NOT NULL DEFAULT 0,
    `passivePerception` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PartyMember_campaignId_name_idx`(`campaignId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PartyMember` ADD CONSTRAINT `PartyMember_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Combatant` ADD CONSTRAINT `Combatant_monsterId_fkey` FOREIGN KEY (`monsterId`) REFERENCES `Monster`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Combatant` ADD CONSTRAINT `Combatant_partyMemberId_fkey` FOREIGN KEY (`partyMemberId`) REFERENCES `PartyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Combatant` ADD CONSTRAINT `Combatant_npcId_fkey` FOREIGN KEY (`npcId`) REFERENCES `NPC`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

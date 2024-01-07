/*
  Warnings:

  - A unique constraint covering the columns `[botId]` on the table `bot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `botId` to the `bot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bot" ADD COLUMN     "botId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bot_botId_key" ON "bot"("botId");

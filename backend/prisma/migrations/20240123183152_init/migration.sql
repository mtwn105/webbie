/*
  Warnings:

  - Added the required column `message` to the `transcript` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transcript" ADD COLUMN     "message" TEXT NOT NULL;

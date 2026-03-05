/*
  Warnings:

  - You are about to drop the column `subscriptionPlan` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "subscriptionPlan",
DROP COLUMN "subscriptionStatus",
ADD COLUMN     "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0;

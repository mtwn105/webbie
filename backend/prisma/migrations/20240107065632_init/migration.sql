-- CreateTable
CREATE TABLE "bot" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "openAiKey" TEXT NOT NULL,
    "slackToken" TEXT NOT NULL,
    "sourceLink" TEXT NOT NULL,
    "botLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_pkey" PRIMARY KEY ("id")
);

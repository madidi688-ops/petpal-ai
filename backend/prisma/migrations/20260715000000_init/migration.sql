-- CreateSchema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('cat', 'dog', 'other');
CREATE TYPE "BehaviorType" AS ENUM ('eat', 'drink', 'sleep', 'play', 'groom', 'toilet', 'other');
CREATE TYPE "ChatRole" AS ENUM ('user', 'assistant', 'system');
CREATE TYPE "EmotionSource" AS ENUM ('chat', 'behavior', 'image');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL DEFAULT 'cat',
    "breed" TEXT,
    "birthday" DATE,
    "avatarUrl" TEXT,
    "personalityNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BehaviorEvent" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "type" "BehaviorType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "imageUrl" TEXT,
    "moodTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BehaviorEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "moodScore" INTEGER NOT NULL,
    "highlightBehaviorIds" TEXT[],
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MBTIProfile" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "ei" INTEGER NOT NULL,
    "sn" INTEGER NOT NULL,
    "tf" INTEGER NOT NULL,
    "jp" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MBTIProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmotionLog" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "source" "EmotionSource" NOT NULL,
    "emotion" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmotionLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");
CREATE INDEX "BehaviorEvent_petId_occurredAt_idx" ON "BehaviorEvent"("petId", "occurredAt" DESC);
CREATE INDEX "ChatSession_petId_updatedAt_idx" ON "ChatSession"("petId", "updatedAt" DESC);
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");
CREATE UNIQUE INDEX "DiaryEntry_petId_date_key" ON "DiaryEntry"("petId", "date");
CREATE INDEX "DiaryEntry_petId_date_idx" ON "DiaryEntry"("petId", "date" DESC);
CREATE UNIQUE INDEX "MBTIProfile_petId_key" ON "MBTIProfile"("petId");
CREATE INDEX "EmotionLog_petId_recordedAt_idx" ON "EmotionLog"("petId", "recordedAt" DESC);

-- FKs
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MBTIProfile" ADD CONSTRAINT "MBTIProfile_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmotionLog" ADD CONSTRAINT "EmotionLog_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

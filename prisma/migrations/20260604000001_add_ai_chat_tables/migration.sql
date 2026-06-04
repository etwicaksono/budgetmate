-- CreateTable
CREATE TABLE "AiChatSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(255),
    "context_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AiChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiChatSession_user_id_idx" ON "AiChatSession"("user_id");

-- CreateIndex
CREATE INDEX "AiChatSession_user_id_created_at_idx" ON "AiChatSession"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "AiChatMessage_session_id_idx" ON "AiChatMessage"("session_id");

-- CreateIndex
CREATE INDEX "AiChatMessage_session_id_created_at_idx" ON "AiChatMessage"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "AiChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

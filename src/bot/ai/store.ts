import type { ModelMessage, TypedToolCall, ToolSet } from "ai";
import { createMemoryStorage } from "@/bot/storage/memory";

const storage = createMemoryStorage<AiChatSession | PendingApproval>();

const SESSION_KEY_PREFIX = "ai:session:";
const APPROVAL_KEY_PREFIX = "ai:approval:";

export const MAX_SESSION_MESSAGES = 20;
export const APPROVAL_TTL_MS = 10 * 60 * 1000;

export interface AiChatSession {
  userId: number;
  messages: ModelMessage[];
  updatedAt: number;
}

export interface PendingApproval {
  approvalId: string;
  toolName: string;
  toolInput: unknown;
  toolCallId: string;
  createdAt: number;
  userId: number;
  chatId: number;
  messageId?: number;
}

function isAiChatSession(value: unknown): value is AiChatSession {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Record<string, unknown>;
  return (
    typeof maybe.userId === "number" &&
    Array.isArray(maybe.messages) &&
    typeof maybe.updatedAt === "number"
  );
}

function isPendingApproval(value: unknown): value is PendingApproval {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Record<string, unknown>;
  return (
    typeof maybe.approvalId === "string" &&
    typeof maybe.toolName === "string" &&
    typeof maybe.toolCallId === "string" &&
    typeof maybe.createdAt === "number" &&
    typeof maybe.userId === "number" &&
    typeof maybe.chatId === "number"
  );
}

function sessionKey(userId: number): string {
  return `${SESSION_KEY_PREFIX}${userId}`;
}

function approvalKey(approvalId: string): string {
  return `${APPROVAL_KEY_PREFIX}${approvalId}`;
}

function pruneMessages(messages: ModelMessage[]): ModelMessage[] {
  if (messages.length <= MAX_SESSION_MESSAGES) return messages;
  return messages.slice(-MAX_SESSION_MESSAGES);
}

export async function getAiChatSession(
  userId: number
): Promise<AiChatSession | null> {
  const session = await storage.read(sessionKey(userId));
  return isAiChatSession(session) ? session : null;
}

export async function saveAiChatSession(session: AiChatSession): Promise<void> {
  await storage.write(sessionKey(session.userId), {
    ...session,
    messages: pruneMessages(session.messages),
    updatedAt: Date.now(),
  });
}

export async function appendAiMessages(
  userId: number,
  messages: ModelMessage[]
): Promise<AiChatSession> {
  const existing = await getAiChatSession(userId);
  const merged = pruneMessages([...(existing?.messages ?? []), ...messages]);

  const session: AiChatSession = {
    userId,
    messages: merged,
    updatedAt: Date.now(),
  };

  await saveAiChatSession(session);
  return session;
}

export async function createSessionWithUserMessage(
  userId: number,
  text: string
): Promise<AiChatSession> {
  return appendAiMessages(userId, [{ role: "user", content: text }]);
}

export async function deleteAiChatSession(userId: number): Promise<void> {
  await storage.delete(sessionKey(userId));
}

export async function savePendingApproval(
  approval: PendingApproval
): Promise<void> {
  await storage.write(approvalKey(approval.approvalId), approval);
}

export async function getPendingApproval(
  approvalId: string
): Promise<PendingApproval | null> {
  const approval = await storage.read(approvalKey(approvalId));
  if (!isPendingApproval(approval)) return null;

  if (Date.now() - approval.createdAt > APPROVAL_TTL_MS) {
    await deletePendingApproval(approvalId);
    return null;
  }

  return approval;
}

export async function deletePendingApproval(approvalId: string): Promise<void> {
  await storage.delete(approvalKey(approvalId));
}

export function toPendingApproval(
  params: {
    approvalId: string;
    userId: number;
    chatId: number;
    messageId?: number;
  },
  toolCall: TypedToolCall<ToolSet>
): PendingApproval {
  return {
    approvalId: params.approvalId,
    userId: params.userId,
    chatId: params.chatId,
    toolName: toolCall.toolName,
    toolCallId: toolCall.toolCallId,
    toolInput: toolCall.input,
    createdAt: Date.now(),
    messageId: params.messageId,
  };
}

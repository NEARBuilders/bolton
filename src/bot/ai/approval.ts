import type { Api, RawApi } from "grammy";
import { randomUUID } from "node:crypto";
import z from "zod";

import {
  type ApprovalData,
  deleteApprovalMessage,
  sendApprovalRequest,
} from "@/bot/utils/approval";

export enum ApproveToolStatus {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  TIMEOUT = "TIMEOUT",
}

type PendingApproval = {
  resolve: (status: ApproveToolStatus) => void;
  reject: (error: Error) => void;
  telegramUserId: number | null;
  botApi: Api<RawApi> | null;
  messageId: number | null;
  approvalData: ApprovalData;
  timeoutId: ReturnType<typeof setTimeout>;
};

const APPROVAL_TIMEOUT_MS = 30_000;
const pendingApprovals = new Map<string, PendingApproval>();

const ContextSchema = z.object({
  autoApprove: z.boolean().optional(),
  telegramUserId: z.number().int().positive().optional(),
  approvalTimeoutMs: z.number().int().positive().optional(),
});

function parseContext(context: unknown): {
  autoApprove: boolean;
  telegramUserId: number | null;
  botApi: Api<RawApi> | null;
  approvalTimeoutMs: number;
} {
  const parsed = ContextSchema.safeParse(context);
  const base = parsed.success
    ? {
        autoApprove: parsed.data.autoApprove ?? false,
        telegramUserId: parsed.data.telegramUserId ?? null,
        approvalTimeoutMs: parsed.data.approvalTimeoutMs ?? APPROVAL_TIMEOUT_MS,
      }
    : {
        autoApprove: false,
        telegramUserId: null,
        approvalTimeoutMs: APPROVAL_TIMEOUT_MS,
      };

  const maybe =
    context && typeof context === "object"
      ? (context as Record<string, unknown>)
      : null;

  return {
    ...base,
    botApi: (maybe?.botApi as Api<RawApi> | undefined) ?? null,
  };
}

function cleanupApproval(
  id: string,
  options?: { deleteMessage?: boolean }
): void {
  const pending = pendingApprovals.get(id);
  if (!pending) return;

  clearTimeout(pending.timeoutId);

  if (
    options?.deleteMessage !== false &&
    pending.telegramUserId &&
    pending.messageId &&
    pending.botApi
  ) {
    void deleteApprovalMessage({
      botApi: pending.botApi,
      telegramUserId: pending.telegramUserId,
      messageId: pending.messageId,
    });
  }

  pendingApprovals.delete(id);
}

export function createApprovalId(prefix = "approval"): string {
  const suffix = randomUUID().replace(/-/g, "");
  return `${prefix}-${suffix}`;
}

export function approveTool({
  id,
  status,
  telegramUserId,
}: {
  id: string;
  status: ApproveToolStatus;
  telegramUserId: number;
}): { ok: boolean; reason?: "not_found" | "unauthorized" } {
  const pending = pendingApprovals.get(id);
  if (!pending) {
    return { ok: false, reason: "not_found" };
  }

  if (pending.telegramUserId && pending.telegramUserId !== telegramUserId) {
    return { ok: false, reason: "unauthorized" };
  }

  pending.resolve(status);
  // Keep the approval message so callback handler can edit it to final status.
  cleanupApproval(id, { deleteMessage: false });
  return { ok: true };
}

export async function waitForApproval({
  id,
  context,
  approvalData,
}: {
  id: string;
  userId: string;
  context: unknown;
  approvalData: ApprovalData;
}): Promise<{ status: ApproveToolStatus }> {
  const { autoApprove, telegramUserId, botApi, approvalTimeoutMs } =
    parseContext(context);

  if (autoApprove) {
    return { status: ApproveToolStatus.APPROVED };
  }

  const { promise, resolve, reject } = Promise.withResolvers<{
    status: ApproveToolStatus;
  }>();

  const timeoutId = setTimeout(() => {
    if (!pendingApprovals.has(id)) return;
    cleanupApproval(id);
    resolve({ status: ApproveToolStatus.TIMEOUT });
  }, approvalTimeoutMs);

  const pending: PendingApproval = {
    resolve: (status) => resolve({ status }),
    reject,
    telegramUserId,
    botApi,
    messageId: null,
    approvalData,
    timeoutId,
  };

  pendingApprovals.set(id, pending);

  if (!telegramUserId || !botApi) {
    return promise;
  }

  sendApprovalRequest({
    botApi,
    telegramUserId,
    approvalId: id,
    approvalData,
  })
    .then((messageId) => {
      const current = pendingApprovals.get(id);
      if (!current) return;
      current.messageId = messageId;
    })
    .catch((error) => {
      console.error("Failed to send telegram approval request:", error);
    });

  return promise;
}

export function getPendingApproval({
  id,
}: {
  id: string;
}):
  | {
      telegramUserId: number | null;
      approvalData: ApprovalData;
    }
  | undefined {
  const pending = pendingApprovals.get(id);
  if (!pending) return undefined;

  return {
    telegramUserId: pending.telegramUserId,
    approvalData: pending.approvalData,
  };
}

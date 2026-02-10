import type { Api, RawApi } from "grammy";
import { InlineKeyboard } from "grammy";

interface SendApprovalRequestParams {
  botApi: Api<RawApi>;
  telegramUserId: number;
  approvalId: string;
  approvalData: ApprovalData;
}

interface DeleteApprovalMessageParams {
  botApi: Api<RawApi>;
  telegramUserId: number;
  messageId: number;
}

export interface SwapApprovalData {
  kind: "swap";
  fromAmount: string;
  fromTokenSymbol: string;
  toAmount: string;
  toTokenSymbol: string;
  fromChain?: string;
  toChain?: string;
}

export interface TransferApprovalData {
  kind: "transfer";
  amount: string;
  tokenSymbol: string;
  toAddress: string;
  chain?: string;
}

export interface WithdrawApprovalData {
  kind: "withdraw";
  amount: string;
  tokenSymbol: string;
  toAddress: string;
  chain?: string;
  receiveAmount?: string;
  feeAmount?: string;
}

export interface DcaApprovalData {
  kind: "dca";
  action: "create" | "stop";
  ruleId?: string;
  fromAmount?: string;
  fromTokenSymbol?: string;
  toAmount?: string;
  toTokenSymbol?: string;
  fromChain?: string;
  toChain?: string;
  cron?: string;
}

export type ApprovalData =
  | SwapApprovalData
  | TransferApprovalData
  | WithdrawApprovalData
  | DcaApprovalData;

function trimAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatActionSummary(data: ApprovalData): string[] {
  if (data.kind === "swap") {
    const chainPart =
      data.fromChain && data.toChain
        ? ` (${data.fromChain} -> ${data.toChain})`
        : "";

    return [
      "Action: Swap",
      `From: ${data.fromAmount} ${data.fromTokenSymbol}`,
      `To: ${data.toAmount} ${data.toTokenSymbol}${chainPart}`,
    ];
  }

  if (data.kind === "transfer") {
    return [
      "Action: Transfer",
      `Amount: ${data.amount} ${data.tokenSymbol}`,
      `Recipient: ${trimAddress(data.toAddress)}`,
      ...(data.chain ? [`Chain: ${data.chain}`] : []),
    ];
  }

  if (data.kind === "dca") {
    if (data.action === "stop") {
      return [
        "Action: Stop DCA Rule",
        ...(data.ruleId ? [`Rule ID: ${data.ruleId}`] : []),
      ];
    }

    const chainPart =
      data.fromChain && data.toChain
        ? ` (${data.fromChain} -> ${data.toChain})`
        : "";

    return [
      "Action: Create DCA Rule",
      ...(data.fromAmount && data.fromTokenSymbol
        ? [`Spend: ${data.fromAmount} ${data.fromTokenSymbol}`]
        : []),
      ...(data.toAmount && data.toTokenSymbol
        ? [`Expected: ${data.toAmount} ${data.toTokenSymbol}${chainPart}`]
        : []),
      ...(data.cron ? [`Schedule (UTC): ${data.cron}`] : []),
    ];
  }

  return [
    "Action: Withdraw",
    `Amount: ${data.amount} ${data.tokenSymbol}`,
    ...(data.receiveAmount
      ? [`Expected receive: ${data.receiveAmount} ${data.tokenSymbol}`]
      : []),
    ...(data.feeAmount ? [`Estimated fee: ${data.feeAmount} ${data.tokenSymbol}`] : []),
    `Destination: ${trimAddress(data.toAddress)}`,
    ...(data.chain ? [`Chain: ${data.chain}`] : []),
  ];
}

function buildApprovalMessage(data: ApprovalData): string {
  return [
    "Transaction approval required",
    "",
    ...formatActionSummary(data),
    "",
    "If you confirm, the transaction will be submitted.",
    "If you reject, the transaction will be cancelled.",
    "",
    "Timeout: 30 seconds.",
  ].join("\n");
}

export function buildFinalApprovalMessage(
  approved: boolean,
  data: ApprovalData
): string {
  const title = approved ? "Transaction approved" : "Transaction rejected";
  const detail = approved
    ? "Your transaction has been confirmed and is being processed."
    : "You rejected this transaction. It will not be processed.";

  return [title, "", ...formatActionSummary(data), "", detail].join("\n");
}

export async function sendApprovalRequest({
  botApi,
  telegramUserId,
  approvalId,
  approvalData,
}: SendApprovalRequestParams): Promise<number> {
  const keyboard = new InlineKeyboard()
    .text("✅ Confirm", `approval_confirm_${approvalId}`)
    .text("❌ Reject", `approval_reject_${approvalId}`);

  const message = await botApi.sendMessage(
    telegramUserId,
    buildApprovalMessage(approvalData),
    {
      reply_markup: keyboard,
    }
  );

  return message.message_id;
}

export async function deleteApprovalMessage({
  botApi,
  telegramUserId,
  messageId,
}: DeleteApprovalMessageParams): Promise<void> {
  try {
    await botApi.deleteMessage(telegramUserId, messageId);
  } catch (error) {
    console.error("Failed to delete approval message:", error);
  }
}

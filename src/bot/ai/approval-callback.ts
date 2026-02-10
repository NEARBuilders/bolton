export function parseApprovalCallback(data: string):
  | { action: "confirm" | "reject"; approvalId: string }
  | null {
  const match = data.match(/^approval_(confirm|reject)_([\w-]+)$/);
  if (!match) return null;

  const action = match[1] as "confirm" | "reject";
  const approvalId = match[2];
  if (!approvalId) return null;

  return { action, approvalId };
}

import { getBalancesTools } from "./balances";
import { getDcaTools } from "./dca";
import { getDepositTools } from "./deposit";
import { getSwapTools } from "./swap";
import { getTokensTools } from "./tokens";
import { getTransferTools } from "./transfer";
import { getWithdrawTools } from "./withdraw";

export function getAgentTools() {
  return {
    ...getBalancesTools(),
    ...getTokensTools(),
    ...getDepositTools(),
    ...getSwapTools(),
    ...getWithdrawTools(),
    ...getTransferTools(),
    ...getDcaTools(),
  };
}

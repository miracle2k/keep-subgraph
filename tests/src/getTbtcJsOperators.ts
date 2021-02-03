import { TokenStaking } from "./contracts";
import { getOwners } from "./tbtcJsOwners";

export async function getTbtcJsOperators(block: number) {
  const StakeDelegated = TokenStaking.filters.StakeDelegated();
  const operators = await TokenStaking.queryFilter(
    StakeDelegated,
    0,
    block
  ).then((events) => events.map((op) => op.args!.operator as string));
  const ownersAndOperators = await getOwners(operators, block);
  return ownersAndOperators;
}

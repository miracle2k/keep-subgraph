import { TokenStaking } from "./contracts";
import { getOwners } from "./tbtcJsOwners";
//import {spawnSync} from "child_process"

export async function getAllOperators(block: number) {
  const StakeDelegated = TokenStaking.filters.StakeDelegated();
  const operators = await TokenStaking.queryFilter(
    StakeDelegated,
    0,
    block
  ).then((events) => events.map((op) => op.args!.operator as string));
  const ownersAndOperators = await getOwners(operators, block);
  //const ownersAndOperators = spawnSync("node", ["--experimental-modules", "--experimental-json-modules", "bin/owner-lookup.js"]).stdout.toString()
  return ownersAndOperators;
}

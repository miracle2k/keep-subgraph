import { BigNumber, ethers } from "ethers";
import { NoAmountOperator } from "./types";
import { TokenStaking } from "./contracts";

interface DelegationInfo {
  amount: BigNumber;
  createdAt: BigNumber;
  undelegatedAt: BigNumber;
}

const e18 = BigNumber.from(10).pow(18);

export default async function etherStrategy(
  ops: NoAmountOperator[],
  block: number
) {
  const opStakes = await Promise.all(
    ops.map(async (op) => {
      const address = op.address;
      let stakedAmount: string = "0";
      try {
        stakedAmount = await TokenStaking.getDelegationInfo(address, {
          blockTag: block,
        }).then(
          (res: DelegationInfo) => res.amount.div(e18).toString().split(".")[0]
        );
      } catch (e) {
        console.log("voteCount", e);
      }
      return {
        owner: op.owner,
        stakedAmount,
        address: op.address,
      };
    })
  );
  return opStakes;
  /*
    const filter = contract.filters.CourtesyCalled();
    contract.queryFilter(filter, -10000000000).then(a => console.log(a.length))
    */
}

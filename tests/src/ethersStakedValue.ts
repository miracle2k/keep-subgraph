import { BigNumber } from "ethers";
import { NoAmountOperator } from "./types";
import { TokenStaking } from "./contracts";

interface DelegationInfo {
  amount: BigNumber;
  createdAt: BigNumber;
  undelegatedAt: BigNumber;
}

const e18 = BigNumber.from(10).pow(18);

export default async function (ops: NoAmountOperator[], block: number) {
  const opStakes = await Promise.all(
    ops.map(async (op) => {
      const address = op.address;
      let stakedAmount: string = "0";
      while (true) {
        try {
          stakedAmount = await TokenStaking.getDelegationInfo(address, {
            blockTag: block,
          }).then((res: DelegationInfo) => res.amount.div(e18).toString());
        } catch (e) {
          if (e.code === "TIMEOUT") {
            continue;
          } else {
            console.log("stakedValue", e);
          }
        }
      }
      return {
        owner: op.owner,
        stakedAmount,
        address: op.address,
      };
    })
  );
  return opStakes;
}

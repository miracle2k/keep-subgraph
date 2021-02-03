import { Operator } from "./types";
import {
  getAllSubgraphOperators,
  getCurrentSubgraphBlock,
} from "./getSubgraphOperators";
import assert from "assert";
import getEthersStakedValue from "./ethersStakedValue";
import { getTbtcJsOperators } from "./getTbtcJsOperators";
import { getAddress } from "@ethersproject/address";

function sortOperators(op1: Operator, op2: Operator) {
  if (op1.address < op2.address) {
    return -1;
  } else if (op1.owner > op2.owner) {
    return 1;
  } else {
    if (op1.address < op2.address) {
      return -1;
    } else if (op1.address > op2.address) {
      return 1;
    } else {
      return 0;
    }
  }
}

function processOps(ops: Operator[]) {
  return ops
    .map(({ owner, address, stakedAmount }) => ({
      owner: getAddress(owner),
      address: getAddress(address),
      stakedAmount,
    }))
    .sort(sortOperators);
}

(async () => {
  const block = await getCurrentSubgraphBlock();
  const subgraphOps = await getAllSubgraphOperators(block).then(processOps);
  const etherOps = await getTbtcJsOperators(block)
    .then((ops) => getEthersStakedValue(ops, block))
    .then(processOps);

  for (let i = 0; i < subgraphOps.length; i++) {
    try {
      assert.deepStrictEqual(subgraphOps[i].address, etherOps[i].address);
    } catch (e) {
      console.warn(e);
    }
    if (etherOps[i].owner === "0xDa534b567099Ca481384133bC121D5843F681365") {
      console.log("TokenStakingEscrow");
      console.log(etherOps[i].address, etherOps[i].owner);
    } else if (
      etherOps[i].owner === "0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b"
    ) {
      console.log("StakingPortBacker");
      console.log(etherOps[i].address, etherOps[i].owner);
    } else if (subgraphOps[i].owner !== etherOps[i].owner) {
      console.log(
        subgraphOps[i].address,
        subgraphOps[i].owner,
        etherOps[i].owner
      );
    }
  }
  assert.deepStrictEqual(subgraphOps, etherOps);
})();

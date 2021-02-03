import { Operator, NoAmountOperator } from "./types";
import {
  getVoterOperators,
  getAllOperators as getAllSubgraphOperators,
} from "./getSubgraphOperators";
import assert from "assert";
import ethersVoteCount from "./ethersVoteCount";
import getProposalBock, { getVoters } from "./getProposalBlock";
import { getAllOperators as getEthersOperators } from "./getEthersOperators";
import { getAllOperators as getTbtcJsOperators } from "./getTbtcJsOperators";
import snapshotVotesTest from "./data/snapshotVotesTest";
import { getAddress } from "@ethersproject/address";

const proposalId = "QmPDw5uewBgmVkw55fnm82TdqRKMhqf6EsP4RMu5sHFLGY";

interface Votes {
  [address: string]: number;
}

function consolidateVotes(ops: Operator[], property: "owner" | "address") {
  const score = {} as Votes;
  ops.forEach((op) => {
    const userAddress = getAddress(op[property]);
    if (!score[userAddress]) score[userAddress] = 0;
    score[userAddress] = score[userAddress] + Number(op.stakedAmount);
  });
  return score;
}

function sortOperators(op1: NoAmountOperator, op2: NoAmountOperator) {
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

function processOpsForFullComparison(ops: NoAmountOperator[]) {
  return ops
    .map(({ owner, address }) => ({
      owner: getAddress(owner),
      address: getAddress(address),
    }))
    .sort(sortOperators);
}

function processOpsForOperatorComparison(ops: NoAmountOperator[]) {
  return ops.map((op) => op.address.toLowerCase()).sort();
}

(async () => {
  const block = 10980995; //await getProposalBock(proposalId);
  console.log(block);
  const subgraphOps = await getAllSubgraphOperators(block);
  const etherOps = await getTbtcJsOperators(block);
  //console.log(etherOps)
  //const voters = await getVoters(proposalId);
  //const etherVoters = etherOps.filter(op=>voters.some(voter=>op.owner.toLowerCase()===voter))
  //console.log((etherOps.sort((a,b)=>a.address.toLowerCase()>b.address.toLowerCase()?1:-1).map(a=>`${a.address.toLowerCase()}\t${a.owner}`).join("\n")))
  //const subgraphOps = await getVoterOperators(proposalId, block);
  //console.log(etherOps, etherOps.sort(sortOperators))
  assert.deepStrictEqual(
    processOpsForOperatorComparison(etherOps),
    processOpsForOperatorComparison(subgraphOps)
  );
  const graph = processOpsForFullComparison(subgraphOps);
  const eth = processOpsForFullComparison(etherOps);
  for (let i = 0; i < subgraphOps.length; i++) {
    try {
      assert.deepStrictEqual(graph[i].address, eth[i].address);
    } catch (e) {
      console.warn(e);
    }
    if (eth[i].owner === "0xDa534b567099Ca481384133bC121D5843F681365") {
      console.log("TokenStakingEscrow");
      console.log(eth[i].address, eth[i].owner);
    } else if (eth[i].owner === "0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b") {
      console.log("StakingPortBacker");
      console.log(eth[i].address, eth[i].owner);
    } else if (graph[i].owner !== eth[i].owner) {
      console.log(graph[i].address, graph[i].owner, eth[i].owner);
    }
  }
  assert.deepStrictEqual(graph, eth);
  const subgraphVotes = consolidateVotes(subgraphOps, "owner");
  const ethersVotes = await ethersVoteCount(etherOps, block).then((votes) =>
    consolidateVotes(votes, "owner")
  );
  assert.deepStrictEqual(subgraphVotes, ethersVotes);
})();

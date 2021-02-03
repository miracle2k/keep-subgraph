import fetch from "node-fetch";
import { Operator } from "./types";

interface SubgraphResponse {
  data: {
    operators: Operator[];
  };
}

export async function getVoterOperators(proposalId: string, block: number) {
  const voters = Object.keys(
    await fetch(
      `https://hub.snapshot.page/api/keepstakers.eth/proposal/${proposalId}`
    ).then((res) => res.json())
  ).map((a) => a.toLowerCase());

  const ops: SubgraphResponse = await fetch(
    "https://api.thegraph.com/subgraphs/name/miracle2k/all-the-keeps",
    {
      method: "POST",
      body: JSON.stringify({
        query: `query { operators (where: {owner_in: ${JSON.stringify(
          voters
        )}}, first: 1000, block: {number: ${block}}) { owner address stakedAmount } }`,
      }),
    }
  ).then((res) => res.json());

  return ops.data.operators;
}

export async function getAllOperators(block: number) {
  const ops: SubgraphResponse = await fetch(
    "https://api.thegraph.com/subgraphs/name/corollari/atktest2",
    {
      method: "POST",
      body: JSON.stringify({
        query: `query { operators (first: 1000, block: {number: ${block}}) { owner address stakedAmount } }`,
      }),
    }
  ).then((res) => res.json());

  return ops.data.operators;
}

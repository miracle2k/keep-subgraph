import fetch from "node-fetch";
import { Operator } from "./types";

interface OperatorsSubgraphResponse {
  data: {
    operators: Operator[];
  };
}

interface MetaSubgraphResponse {
  "data": {
    "_meta": {
      "block": {
        "number": number
      }
    }
  }
}

const subgraphUrl = "https://api.thegraph.com/subgraphs/name/corollari/atktest2"

function subgraphCall(query:string){
  return fetch(
    subgraphUrl,
    {
      method: "POST",
      body: JSON.stringify({
        query,
      }),
    }
  ).then((res) => res.json());
}

export async function getAllSubgraphOperators(block: number) {
  const ops: OperatorsSubgraphResponse = await subgraphCall(`query { operators (first: 1000, block: {number: ${block}}) { owner address stakedAmount } }`)

  return ops.data.operators;
}

export async function getCurrentSubgraphBlock() {
  const response: MetaSubgraphResponse = await subgraphCall(`query { _meta { block { number } } }`)

  return response.data._meta.block.number;
}
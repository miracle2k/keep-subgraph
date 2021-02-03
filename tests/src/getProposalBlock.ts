import fetch from "node-fetch";

interface ProposalMsg {
  version: "0.1.3";
  timestamp: string;
  space: "keepstakers.eth";
  type: "proposal";
  payload: {
    name: string;
    body: string;
    choices: string[];
    start: number;
    end: number;
    snapshot: string; //eg "11693671";
    metadata: {
      strategies: { name: string; params: any }[];
    };
  };
}

interface IPFSProposal {
  address: string;
  msg: string;
  sig: string;
  version: string;
}

export default async function (proposalId: string) {
  const proposal: ProposalMsg = await fetch(
    `https://ipfs.fleek.co/ipfs/${proposalId}`
  )
    .then((res) => res.json())
    .then((res: IPFSProposal) => JSON.parse(res.msg));
  return Number(proposal.payload.snapshot);
}

export async function getVoters(proposalId: string) {
  const voters = Object.keys(
    await fetch(
      `https://hub.snapshot.page/api/keepstakers.eth/proposal/${proposalId}`
    ).then((res) => res.json())
  ).map((a) => a.toLowerCase());
  return voters;
}

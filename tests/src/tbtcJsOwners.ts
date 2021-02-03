/*
This code is a port of the one on tbtc.js, now you may be wondering why go through all the work of re-writing this code here when it may have been easier to do something else, FAQ:
> Why not import the code
Spent 3 hours trying to do that but just kept running across module problems
> Why not call the code externally using child_process?
Tried that as well but I just kept getting cryptic "Error: No deployment info found for contract TokenGrant" errors

So the quickest solution turned out to be a reimplementation
*/

import {
  TokenStaking,
  TokenGrant,
  provider,
  StakingPortBacker,
  TokenStakingEscrow,
  TokenGrantStakedEventABI
} from "./contracts";
import { ethers } from "ethers";
import Web3 from "web3";
import ManagedGrantJSON from "@keep-network/keep-core/artifacts/ManagedGrant.json";

const ManagedGrantABI = ManagedGrantJSON.abi;

const web3 = new Web3();

export function getOwners(operators: string[], blockTag: number) {
  return Promise.all(
    operators.map(async (operator) => ({
      address: operator,
      owner: await lookupOwner(operator, blockTag),
    }))
  );
}

export async function lookupOwner(operator: string, blockTag: number) {
  while (true) {
    try {
      const owner = await TokenStaking.ownerOf(operator, { blockTag }).then(
        (owner: string) => {
          try {
            return resolveOwner(owner, operator, blockTag);
          } catch (e) {
            return `Unknown (${e})`;
          }
        }
      );
      return owner;
    } catch (e) {
      if (e.code === "TIMEOUT") {
        continue;
      } else {
        console.log("lookup", e);
      }
    }
  }
}

async function resolveOwner(
  owner: string,
  operator: string,
  blockTag: number
): Promise<string> {
  if ((await provider.getStorageAt(owner, 0)) === "0x") {
    return owner; // owner is already a user-owned account
  } else if (owner == StakingPortBacker.address) {
    const { owner } = await StakingPortBacker.copiedStakes(operator, {
      blockTag,
    });
    return resolveOwner(owner, operator, blockTag);
  } else if (owner == TokenStakingEscrow.address) {
    const [{ args }] = await TokenStakingEscrow.queryFilter(
      TokenStakingEscrow.filters.DepositRedelegated(null, operator),
      0,
      blockTag
    );
    const grantId = args!.grantId;
    const { grantee } = await TokenGrant.getGrant(grantId, { blockTag });
    return resolveGrantee(grantee, blockTag);
  } else {
    // If it's not a known singleton contract, try to see if it's a
    // TokenGrantStake; if not, assume it's an owner-controlled contract.
    while (true) {
      try {
        const [{ transactionHash }] = await TokenStaking.queryFilter(
          TokenStaking.filters.StakeDelegated(null, operator),
          0,
          blockTag
        );
        const { logs } = await provider.getTransactionReceipt(transactionHash);
        let grantId = null;
        for (const i in logs) {
          const { data, topics } = logs[i];
          if (topics[0] == TokenGrantStakedEventABI.signature) {
            const decoded = web3.eth.abi.decodeLog(
              TokenGrantStakedEventABI.inputs,
              data,
              topics.slice(1)
            );
            grantId = decoded.grantId;
            break;
          }
        }

        const { grantee } = await TokenGrant.getGrant(grantId, { blockTag });
        return resolveGrantee(grantee, blockTag);
      } catch (e) {
        if (e.code === "TIMEOUT") {
          continue;
        }
        // If we threw, assume this isn't a TokenGrantStake and the
        // owner is just an unknown contract---e.g. Gnosis Safe.
        return owner;
      }
    }
  }
}

async function resolveGrantee(
 grantee: string,
  blockTag: number
) {
  while (true) {
    if ((await provider.getStorageAt(grantee, 0)) === "0x") {
      return grantee; // grantee is already a user-owned account
    } else {
      try {
        const grant = new ethers.Contract(grantee, ManagedGrantABI, provider);

        return await grant.grantee({ blockTag });
      } catch (e) {
        if (e.code === "TIMEOUT") {
          continue;
        }
        // If we threw, assume this isn't a ManagedGrant and the
        // grantee is just an unknown contract---e.g. Gnosis Safe.
        return grantee;
      }
    }
  }
}

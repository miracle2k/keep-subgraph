import {Transfer} from "../generated/TBTCToken/TBTCTokenContract";

export function handleMintTBTCToken(event: Transfer): void {
  // I wanted to use this to set the "minted" stats on a deposit, but we can't really access the deposit here.
  // Maybe start tracking tBTC instead?
}
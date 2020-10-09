import {BigInt} from "@graphprotocol/graph-ts/index";

export function getRelayEntryId(requestId: BigInt): string {
  return 're_' + requestId.toString()
}
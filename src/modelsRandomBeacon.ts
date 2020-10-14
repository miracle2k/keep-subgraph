import {BigInt, Bytes} from "@graphprotocol/graph-ts/index";

export function getRelayEntryId(requestId: BigInt): string {
  return 're_' + requestId.toString()
}

export function getBeaconGroupId(pubKey: Bytes): string {
  // Cut off the group pub key, we don't want the ids to to be unreasonably long.
  return pubKey.toHexString().slice(0, 62)
}
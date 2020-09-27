import {BIGDECIMAL_ZERO} from "./constants";
import {Address, BigInt} from "@graphprotocol/graph-ts/index";
import {KeepMember} from "../generated/schema";

export function getOrCreateKeepMember(keeperAddress: Address): KeepMember {
  let member = KeepMember.load(keeperAddress.toHexString());
  if (member == null) {
    member = new KeepMember(keeperAddress.toHexString());
    member.address = keeperAddress;
    member.totalKeepCount = 0;
    member.activeKeepCount = 0;
    member.bonded = BIGDECIMAL_ZERO;
    member.unboundAvailable = BIGDECIMAL_ZERO;
  }
  return member!;
}
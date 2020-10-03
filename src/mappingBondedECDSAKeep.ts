import {
  KeepClosed,
  KeepTerminated,
  PublicKeyPublished,
  SubmitPublicKeyCall
} from "../generated/templates/BondedECDSAKeep/BondedECDSAKeep";
import {BondedECDSAKeep} from "../generated/schema";
import {getOrCreateOperator} from "./helpers";
import {Address} from "@graphprotocol/graph-ts/index";

/**
 * Event: PublicKeyPublished.
 *
 * Emitted after a threshold of signers has called submitPublicKey().
 */
export function handlePublicKeyPublished(event: PublicKeyPublished): void {
  let keep = BondedECDSAKeep.load(event.address.toHexString())!;
  keep.publicKey = event.params.publicKey;
  keep.save();
}

export function handleKeepClosed(event: KeepClosed): void {
  let keep = BondedECDSAKeep.load(event.address.toHexString())!;
  keep.status = "CLOSED";
  keep.save();

  reduceMemberKeepCount(keep.members);
}

export function handleKeepTerminated(event: KeepTerminated): void {
  let keep = BondedECDSAKeep.load(event.address.toHexString())!;
  keep.status = "TERMINATED";
  keep.save();

  reduceMemberKeepCount(keep.members);
}

function reduceMemberKeepCount(members: Array<string | null>): void {
  for (let i = 0; i < members.length; i++) {
    let keepMemberAddress = members[i]!;
    let member = getOrCreateOperator(Address.fromHexString(keepMemberAddress) as Address);
    member.activeKeepCount -= 1;
    member.save()
  }
}

// import { dataSource } from "@graphprotocol/graph-ts"
// let context = dataSource.context()
// let tradingPair = context.getString("tradingPair")
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

/**
 * Every signer in a keep submits the key using this call. When all keys have been submitted,
 * PublicKeyPublished is emitted.
 *
 * We want to keep track of which signers did or did not submit their key, so we can blame someone.
 */
export function handleSubmitPublicKey(call: SubmitPublicKeyCall): void {
  let keep = BondedECDSAKeep.load(call.to.toHexString())!;
  let array = keep.pubkeySubmissions;
  array.push(call.from.toHexString())
  keep.pubkeySubmissions = array;
  keep.save()

  // TODO: This could also be a log entry, but probably one that we want to show as "lesser", and possible
  // hide it in some cases where it is not important (give it a `important=low` property).
}

import {
  ERC20RewardDistributed, ETHRewardDistributed,
  KeepClosed,
  KeepTerminated,
  PublicKeyPublished,
  SubmitPublicKeyCall
} from "../generated/templates/BondedECDSAKeep/BondedECDSAKeep";
import {BondedECDSAKeep, Deposit} from "../generated/schema";
import {getOrCreateOperator} from "./models";
import {Address, log, BigInt, BigDecimal} from "@graphprotocol/graph-ts/index";
import {getDepositIdFromAddress} from "./mapping";
import {toDecimal} from "./decimalUtils";

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


// Call path: Deposit.provideRedemptionProof() -> Deposit.distributeSignerFee() -> Keep.distributeERC20Reward().
export function handleERC20RewardDistributed(event: ERC20RewardDistributed): void {
  // We don't get the keep address in this event, but so have to assume that this tx was a provideRedemptionProof()
  // call to the deposit, and then we get the keep from there.
  // NB: It is an event triggered by the keep contract, but called through the deposit.
  let depositAddress = event.transaction.to!;
  let deposit = Deposit.load(getDepositIdFromAddress(depositAddress))!;

  let keep = BondedECDSAKeep.load(deposit.bondedECDSAKeep!)!;
  let members = keep.members;
  for (let i=0; i<members.length; i++) {
    let operator = getOrCreateOperator(Address.fromString(members[i]!));
    operator.totalTBTCRewards = operator.totalTBTCRewards.plus(
      event.params.amount.div(BigInt.fromI32(members.length))
    );
    operator.save()
  }

}

// Seems like this is never used in the contracts.
export function handleETHRewardDistributed(event: ETHRewardDistributed): void {}
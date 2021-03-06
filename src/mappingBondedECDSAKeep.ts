import {
  ERC20RewardDistributed, ETHRewardDistributed,
  KeepClosed,
  KeepTerminated,
  PublicKeyPublished,
  SubmitPublicKeyCall
} from "../generated/templates/BondedECDSAKeep/BondedECDSAKeep";
import {BondedECDSAKeep, Deposit, StakedropInterval} from "../generated/schema";
import {getOrCreateOperator, getStats} from "./models";
import {Address, BigInt, log} from "@graphprotocol/graph-ts/index";
import {getDepositIdFromAddress} from "./mapping";

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

  // Closed keeps have their rewards become withdrawable.
  if (keep.stakedropInterval) {
    keep.stakedropRewardStatus = 'WITHDRAWABLE';
  }

  keep.save();

  reduceMemberKeepCount(keep.members);
}

export function handleKeepTerminated(event: KeepTerminated): void {
  let keep = BondedECDSAKeep.load(event.address.toHexString())!;
  keep.status = "TERMINATED";

  // Terminated keeps become ineligible for stakedrop rewards.
  if (keep.stakedropInterval) {
    keep.stakedropRewardStatus = 'INELIGABLE';
  }

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


/**
 * Event: ERC20RewardDistributed
 *
 * Emitted when a deposit is redeemed, and the signers get paid their reward in the TBTC (ERC20 token).
 *
 * Call path: Deposit.provideRedemptionProof() -> Deposit.distributeSignerFee() -> Keep.distributeERC20Reward().
 */
export function handleERC20RewardDistributed(event: ERC20RewardDistributed): void {
  // We don't get the keep address in this event, but so have to assume that this tx was a provideRedemptionProof()
  // call to the deposit, and then we get the keep from there.
  // NB: It is an event triggered by the keep contract, but called through the deposit.
  let depositAddress = event.transaction.to!;
  let deposit = Deposit.load(getDepositIdFromAddress(depositAddress));

  if (!deposit) {
    // This happens at least once on ropsten currently: 0x1df961f9d4a7a4e8cb6ff99ac8697f835117d2d9
    // I am assuming then that this is not due to a normal provideRedemptionProof(), but that the event is triggered
    // with an indirect call to it. How could we solve this?
    log.warning('handleERC20RewardDistributed(): no deposit found for {}', [event.transaction.to ? event.transaction.to.toHexString() : "(no event.to)"]);
    return;
  }

  log.info('handleERC20RewardDistributed deposit.keep={}, deposit={}', [deposit.bondedECDSAKeep, deposit.id]);
  let keep = BondedECDSAKeep.load(deposit.bondedECDSAKeep!)!;
  log.info('handleERC20RewardDistributed keep={}', [keep ? keep.id : "not found"]);

  let members = keep.members;
  for (let i=0; i<members.length; i++) {
    let operator = getOrCreateOperator(Address.fromString(members[i]!));
    operator.tbtcFeesEarned = operator.tbtcFeesEarned.plus(
      event.params.amount.div(BigInt.fromI32(members.length))
    );
    operator.totalTBTCRewards = operator.tbtcFeesEarned;
    operator.save()
  }

  let stats = getStats();
  stats.tbtcFees = stats.tbtcFees.plus(event.params.amount);
  stats.save();
}

// Seems like this is never used in the contracts.
export function handleETHRewardDistributed(event: ETHRewardDistributed): void {}
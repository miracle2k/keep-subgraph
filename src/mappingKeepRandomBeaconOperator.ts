import {
  DkgResultSubmittedEvent,
  GroupSelectionStarted,
  KeepRandomBeaconOperator,
  RelayEntryRequested,
  RelayEntrySubmitted
} from "../generated/KeepRandomBeaconOperator/KeepRandomBeaconOperator";
import {RandomBeaconGroup, RelayEntry} from "../generated/schema";
import {getIDFromEvent} from "./utils";
import {getOrCreateOperator, getStatus} from "./models";
import {BIGINT_ZERO} from "./constants";
import {Address, BigDecimal, BigInt} from "@graphprotocol/graph-ts/index";
import {toDecimal} from "./decimalUtils";

/**
 * Event: GroupSelectionStarted
 *
 * KeepRandomBeaconServiceImplV1.entryCreated -> .createGroupIfApplicable() ->
 *    KeepRandomBeaconOperator.createGroup -> This Event.
 */
export function handleGroupSelectionStarted(event: GroupSelectionStarted): void {
    // TODO: A single group selection can be in progress, we may indicate this somewhere.
}


/**
 * Event: DkgResultSubmittedEvent
 *
 * Emitted when submitDkgResult() is called. Complete the group creation process.
 */
export function handleDkgResultSubmittedEvent(event: DkgResultSubmittedEvent): void {
  let group = new RandomBeaconGroup(event.params.groupPubKey.toHexString());
  group.createdAt = event.block.timestamp;
  group.pubKey = event.params.groupPubKey;
  group.rewardPerMember = BIGINT_ZERO;

  let contract = KeepRandomBeaconOperator.bind(event.address);
  let members = contract.getGroupMembers(event.params.groupPubKey);
  group.members = members.map<string>(address => address.toHexString());
  group.memberCount = members.length;
  group.save()
}

// NB: Expiring old groups has no event so far, it seems, is done via selectGroup() which is called by signRelayEntry().


/**
 * Note: This event is emitted *before* the event with the same name from the `RandomBeaconService` contract.
 * However, only here do we have access to the group pubkey, but *there* we have access to the request id.
 *
 * To link the two together, we create the RelayEntry entity here, and store a reference to it in the global
 * Status object.
 */
export function handleRelayEntryRequested(event: RelayEntryRequested): void {
  let entry = new RelayEntry(getIDFromEvent(event));
  entry.requestedAt = event.block.timestamp;
  entry.requestedBy = event.transaction.from;
  entry.group = event.params.groupPublicKey.toHexString();
  entry.save();

  let status = getStatus();
  status.currentRequestedRelayEntry = entry.id;
  status.save();
}

/**
 * `handleRelayEntryGenerated()` from the service contract does the main job of closing out the relay entry,
 * and is called *after* this here.
 *
 * Rewards are assigned in the same function that triggers `RelayEntrySubmitted`, so we do the same. Rewards
 * are given to:
 *
 * - group members: influenced by the delay in responding
 * - submitter: gas + verification fee + 5% of delay penalty
 * - subsidy: goes to the service contract.
 *
 * `rewards.service.js` in `keep-core` helped me write this.
 */
export function handleRelayEntrySubmitted(event: RelayEntrySubmitted): void {
  let status = getStatus();
  let entry = RelayEntry.load(status.currentRequestedRelayEntry!)!;
  let group = RandomBeaconGroup.load(entry.group)!;

  // We call `operatorContract.getGroupMemberRewards(groupPubKey)` to get the curren total available to every
  // member of the group. This value only changes by calling `addGroupMemberReward()`, which is only called whenever
  // `RelayEntrySubmitted` is emitted.
  // We can therefore be sure we are copying over the right value in all cases, and can deduce the fee for this
  // particular RelayEntry as well. Another option would be calling things such as `entryVerificationFee()`
  // when the entry is being requested.

  let operatorContract = KeepRandomBeaconOperator.bind(event.address);
  let rewardPerMember = operatorContract.getGroupMemberRewards(group.pubKey);

  entry.rewardPerMember = rewardPerMember.minus(group.rewardPerMember);
  group.rewardPerMember = rewardPerMember;
  entry.save();
  group.save();

  // Finally, we want to update every operator with this reward.
  let members = group.members;
  for (let i=0; i<members.length; i++) {
    let operator = getOrCreateOperator(Address.fromString(members[i]!));
    operator.totalETHRewards = operator.totalETHRewards.plus(entry.rewardPerMember);
    operator.totalBeaconRewards = operator.totalBeaconRewards.plus(entry.rewardPerMember);
    operator.save()
  }
}

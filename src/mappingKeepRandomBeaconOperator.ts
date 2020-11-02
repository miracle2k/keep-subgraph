import {
  DkgResultSubmittedEvent,
  GroupSelectionStarted,
  KeepRandomBeaconOperator,
  RelayEntryRequested,
  RelayEntrySubmitted
} from "../generated/KeepRandomBeaconOperator/KeepRandomBeaconOperator";
import {Operator, RandomBeaconGroup, RandomBeaconGroupMembership, RelayEntry} from "../generated/schema";
import {getIDFromEvent} from "./utils";
import {getOrCreateOperator, getStatus} from "./models";
import {BIGINT_ZERO} from "./constants";
import {getBeaconGroupId} from "./modelsRandomBeacon";
import {Address, BigDecimal, BigInt, log} from "@graphprotocol/graph-ts/index";
import {BEACON_TYPE, ECDSA_TYPE, getOrCreateStakedropInterval} from "./stakeDrop";

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
  let group = new RandomBeaconGroup(getBeaconGroupId(event.params.groupPubKey));
  group.createdAt = event.block.timestamp;
  group.pubKey = event.params.groupPubKey;
  group.memberships = [];
  group.rewardPerMember = BIGINT_ZERO;

  // Get the operators assigned to this group.
  // NB: There are always 64 members, and a single can be assigned multiple times to a group!
  // While we can absolutely can store duplicate operators in a Operator[] array in `TheGraph`, querying
  // such an array will only return each operator once. Likely related to their SQL query for table-relationships.
  // So, in order to expose the information how often one operator is part of the group, we either have to do
  // a simple string array (rather than an array of Operator references), or we use a `GroupMembership` entity.
  // I prefer the latter, since it means less work for querying clients.

  let contract = KeepRandomBeaconOperator.bind(event.address);
  let members = contract.getGroupMembers(event.params.groupPubKey);

  // Count how often each member occurs
  // @ts-ignore: Link to assemblyscript library for i32.
  let memberCounts: Map<string, i32> = new Map();
  let uniqueAddresses: string[] = []; // Map does not allow us to list entries?
  for (let i=0; i<members.length; i++) {
    let memberAddress = members[i].toHexString();
    if (!memberCounts.has(memberAddress)) {
      memberCounts.set(memberAddress, 1)
      uniqueAddresses.push(memberAddress);
    } else {
      memberCounts.set(memberAddress, memberCounts.get(memberAddress)! + 1)
    }
  }

  // Create a group membership object for each member
  let memberships = group.memberships;
  for (let i=0; i<uniqueAddresses.length; i++) {
    let memberAddress = uniqueAddresses[i];

    let membership = new RandomBeaconGroupMembership('rbgm_' + getBeaconGroupId(group.pubKey) + '_' + memberAddress);
    membership.group = group.id;
    membership.operator = memberAddress;
    membership.count = memberCounts.get(memberAddress)!;
    membership.reward = BIGINT_ZERO;
    membership.groupCreatedAt = group.createdAt;
    membership.save()

    memberships.push(membership.id);

    let operator = getOrCreateOperator(Address.fromString(memberAddress));
    operator.beaconGroupCount += 1;
    operator.save();
  }
  group.memberships = memberships;

  group.size = members.length;
  group.uniqueMemberCount = uniqueAddresses.length;


  let interval = getOrCreateStakedropInterval(event, BEACON_TYPE);
  if (interval) {
    interval.beaconGroupCount += 1;
    interval.save();

    group.stakedropInterval = interval.id;
    // We then probably want to calculate the allocation for this interval, and can then estimate the
    // number of keeps in it.
  }

  group.save()
}

// Group status:
// active: Group has a fixed length in blocks, set at init (groupActiveTimeOf) -> no longer given jobs
// stale: after it is no longer active + relayEntryTimeout (to make sure no active request is served)
// a pointer is used to mark non-active groups as permanently expired (expireOldGroups, done via selectGroup() which is called by signRelayEntry().)
// groups can be terminated early in case of misbehaviour

// so we can change the status manually when an entry is requested
// or, we can handle it via block height.

// functions we may want to catch:
// - reportRelayEntryTimeout()
// - reportUnauthorizedSigning()
// - relayEntryTimeoutPunishment()
// - which operator reported the result? who failed to report?

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
  entry.group = getBeaconGroupId(event.params.groupPublicKey);
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

  // We figure out the reward for this entry by doing: current reward total - last known reward total.
  let rewardForThisEntry = rewardPerMember.minus(group.rewardPerMember);

  entry.rewardPerMember = rewardForThisEntry;
  group.rewardPerMember = rewardPerMember;
  entry.save();
  group.save();

  // Finally, we want to update every operator with this reward.
  let memberships = group.memberships;
  for (let i=0; i<memberships.length; i++) {
    let membership = RandomBeaconGroupMembership.load(memberships[i])!;

    //  An operator can appear multiple times in a group, and will receive a reward multiple times!
    let realReward = rewardForThisEntry.times(BigInt.fromI32(membership.count));
    membership.reward = membership.reward.plus(realReward);
    membership.save()

    let operator = getOrCreateOperator(Address.fromString(membership.operator));
    operator.totalETHRewards = operator.totalETHRewards.plus(realReward);
    operator.totalBeaconRewards = operator.totalBeaconRewards.plus(realReward);
    operator.save()

  }
}

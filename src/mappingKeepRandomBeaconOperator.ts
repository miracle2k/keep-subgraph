import { log } from "@graphprotocol/graph-ts";
import {
  DkgResultSubmittedEvent,
  GroupSelectionStarted, KeepRandomBeaconOperator, RelayEntryRequested, RelayEntrySubmitted
} from "../generated/KeepRandomBeaconOperator/KeepRandomBeaconOperator";
import {RandomBeaconGroup} from "../generated/schema";

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

  let contract = KeepRandomBeaconOperator.bind(event.address);
  let members = contract.getGroupMembers(event.params.groupPubKey);
  group.members = members.map<string>(address => address.toHexString());
  group.memberCount = members.length;
  group.save()
}

// NB: Expiring old groups has no event so far, it seems, is done via selectGroup() which is called by signRelayEntry().



export function handleRelayEntryRequested(event: RelayEntryRequested): void {
  log.info("handleRelayEntryRequested OPERATOR", [])
  // let status = getStatusRecord();
  // status.randomBeaconEntryInProgress =
  // status.save();
}

export function handleRelayEntrySubmitted(event: RelayEntrySubmitted): void {}

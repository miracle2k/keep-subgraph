import { Address } from "@graphprotocol/graph-ts";
import {
  DkgResultSubmittedEvent,
  GroupSelectionStarted, KeepRandomBeaconOperator, RelayEntryRequested
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
  group.save()
}

// NB: Expiring old groups has no event it seems, is done via selectGroup() which is called by signRelayEntry().


export function handleRelayEntryRequested(event: RelayEntryRequested): void {

}

export function handleRelayEntrySubmitted(event: RelayEntryRequested): void {

}

// support KeepRandomBeaconServiceImplV1 and it's two events which give the requestId
// RelayEntryGenerated
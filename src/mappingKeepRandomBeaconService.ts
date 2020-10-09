import {
  RelayEntryGenerated,
  RelayEntryRequested
} from "../generated/KeepRandomBeaconService/KeepRandomBeaconServiceImplV1";
import {RelayEntry} from "../generated/schema";
import {getStatus} from "./models";


export function handleRelayEntryGenerated(event: RelayEntryGenerated): void {
  let status = getStatus();

  let entry = RelayEntry.load(status.currentRequestedRelayEntry!)!;
  entry.generatedAt = event.block.timestamp;
  entry.value = event.params.entry;
  entry.save();

  status.currentRequestedRelayEntry = null;
  status.save()
}

export function handleRelayEntryRequested(event: RelayEntryRequested): void {
  // Get access to the RelayEntry created by the operator contract's `handleRelayEntryRequested`
  // via the global status object.
  let status = getStatus();

  // Add the request id (which we can only get here).
  let entry = RelayEntry.load(status.currentRequestedRelayEntry!)!;
  entry.requestId = event.params.requestId;
  entry.save();
}

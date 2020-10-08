import { BigInt } from "@graphprotocol/graph-ts";
import {
  RelayEntryGenerated,
  RelayEntryRequested
} from "../generated/KeepRandomBeaconService/KeepRandomBeaconServiceImplV1";
import {RelayEntry} from "../generated/schema";


function getRelayEntryId(requestId: BigInt): string {
  return 're_' + requestId.toString()
}

export function handleRelayEntryGenerated(event: RelayEntryGenerated): void {
  let entry = new RelayEntry(getRelayEntryId(event.params.requestId));
  entry.requestId = event.params.requestId;
  entry.generatedAt = event.block.timestamp;
  entry.value = event.params.entry;
  entry.save();
}

export function handleRelayEntryRequested(event: RelayEntryRequested): void {
  let entry = new RelayEntry(getRelayEntryId(event.params.requestId));
  entry.requestId = event.params.requestId;
  entry.requestedAt = event.block.timestamp;
  entry.requestedBy = event.transaction.from;
  entry.save();
}

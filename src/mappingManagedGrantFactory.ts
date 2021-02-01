import {
  ManagedGrantCreated
} from "../generated/ManagedGrantFactory/ManagedGrantFactory";
import {ManagedGrant} from "../generated/templates";


export function handleManagedGrantCreatedEvent(event: ManagedGrantCreated): void {
  ManagedGrant.create(event.params.grantAddress);
}
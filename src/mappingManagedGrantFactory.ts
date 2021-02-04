import {
  ManagedGrantCreated
} from "../generated/ManagedGrantFactory/ManagedGrantFactory";
import {ManagedGrant} from "../generated/templates";
import { ManagedGrant as ManagedGrantContract } from "../generated/ManagedGrantFactory/ManagedGrant"
import {Grant} from '../generated/schema'


export function handleManagedGrantCreatedEvent(event: ManagedGrantCreated): void {
  ManagedGrant.create(event.params.grantAddress);
  let grantId = ManagedGrantContract.bind(event.params.grantAddress).grantId()
  let grant = Grant.load(grantId.toString());
  grant.isManaged=true;
  grant.grantee = event.params.grantee;
  grant.save()
}
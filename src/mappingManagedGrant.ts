import {
  GranteeReassignmentConfirmed,
  StakeCall
} from "../generated/templates/ManagedGrant/ManagedGrant";
import { ManagedGrant } from "../generated/templates/ManagedGrant/ManagedGrant"
import { Grant } from '../generated/schema'
import { Address } from "@graphprotocol/graph-ts/index";
import { getOrCreateOperator } from "./models";


export function handleGranteeReassignmentConfirmedEvent(event: GranteeReassignmentConfirmed): void {
  let grantId = ManagedGrant.bind(event.address).grantId()
  let grant = Grant.load(grantId.toString());
  grant.grantee=event.params.newGrantee;
  grant.save()
  let grantOperators = grant.operators;
  for (let i = 0; i < grantOperators.length; i++) {
    let operator = grantOperators[i];
    let member = getOrCreateOperator(Address.fromHexString(operator) as Address);
    member.owner = event.params.newGrantee;
    member.save()
  }
}

// This always executes after the operation creation events are triggered
// because calls are always handled after all events have been handled
export function handleStakeCall(call: StakeCall): void {
  if (call.inputs._stakingContract.notEqual(Address.fromHexString("0x1293a54e160d1cd7075487898d65266081a15458"))) {
    return; // Old staking contract
  }
  let operator = Address.fromHexString(call.inputs._extraData.toHexString().substring(42, 82)) as Address;
  let grantee = ManagedGrant.bind(call.to).grantee()
  let member = getOrCreateOperator(operator);
  member.owner = grantee;
  member.save()
}
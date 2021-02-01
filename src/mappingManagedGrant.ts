import {
  GranteeReassignmentConfirmed,
  StakeCall
} from "../generated/templates/ManagedGrant/ManagedGrant";
import {ManagedGrant} from "../generated/templates/ManagedGrant/ManagedGrant"
import {Address} from "@graphprotocol/graph-ts/index";
import {getOrCreateOperator} from "./models";


export function handleGranteeReassignmentConfirmedEvent(event: GranteeReassignmentConfirmed): void {
  // TODO
}

// This always executes after the operation creation events are triggered
// because calls are always handled after all events have been handled
export function handleStakeCall(call: StakeCall): void {
  let operator = Address.fromHexString(call.inputs._extraData.toHexString().substring(20, 40)) as Address;
  let grantee = ManagedGrant.bind(call.to).grantee()
  let member = getOrCreateOperator(operator);
  member.owner = grantee;
  member.save()
}
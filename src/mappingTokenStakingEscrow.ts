import {
  DepositRedelegated
} from "../generated/TokenStakingEscrow/TokenStakingEscrow";
import {Grant} from "../generated/schema";
import {getOrCreateOperator} from "./models";


export function handleDepositRedelegatedEvent(event: DepositRedelegated): void {
  let oldMember = getOrCreateOperator(event.params.previousOperator);
  let newMember = getOrCreateOperator(event.params.newOperator);
  let grantId = event.params.grantId.toString()

  let grant = Grant.load(grantId)
  let grantOperators = grant.operators;
  grantOperators.push(event.params.newOperator.toHexString())
  grant.operators = grantOperators
  grant.save();

  newMember.grant = grantId;
  // This event always gets called after StakeDelegated so here we'll be overwriting the previously wrong owner
  newMember.owner = oldMember.owner;
  newMember.save()
}
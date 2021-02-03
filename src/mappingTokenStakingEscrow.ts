import {
  DepositRedelegated
} from "../generated/TokenStakingEscrow/TokenStakingEscrow";
import {Grant} from "../generated/schema";
import {getOrCreateOperator} from "./models";


export function handleDepositRedelegatedEvent(event: DepositRedelegated): void {
  let oldMember = getOrCreateOperator(event.params.previousOperator);
  let newMember = getOrCreateOperator(event.params.newOperator);
  let grant = Grant.load(event.params.grantId.toString());
  grant.operators.push(event.params.newOperator);
  grant.save()
  // This event always gets called after StakeDelegated so here we'll be overwriting the previously wrong owner
  newMember.owner = oldMember.owner;
  newMember.save()
}
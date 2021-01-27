import {
  DepositRedelegated
} from "../generated/TokenStakingEscrow/TokenStakingEscrow";
import {Grant} from "../generated/schema";
import {getOrCreateOperator} from "./models";


export function handleDepositRedelegatedEvent(event: DepositRedelegated): void {
  let member = getOrCreateOperator(event.params.newOperator);
  let grant = Grant.load(event.params.grantId.toString());
  // This event always gets called after StakeDelegated so here we'll be overwriting the previously wrong owner
  member.owner = grant.grantee;
  member.save()
}
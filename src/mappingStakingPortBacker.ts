import {
  StakeCopied
} from "../generated/StakingPortBacker/StakingPortBacker";
import {getOrCreateOperator} from "./models";

// TODO: Set the grant associated with these operators
export function handleStakeCopiedEvent(event: StakeCopied): void {
  let member = getOrCreateOperator(event.params.operator);
  member.owner = event.params.owner;
  member.save()
}
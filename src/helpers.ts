import {BIGDECIMAL_ZERO} from "./constants";
import {Address} from "@graphprotocol/graph-ts/index";
import {Operator} from "../generated/schema";

export function getOrCreateOperator(keeperAddress: Address): Operator {
  let member = Operator.load(keeperAddress.toHexString());
  if (member == null) {
    member = new Operator(keeperAddress.toHexString());
    member.address = keeperAddress;
    member.totalKeepCount = 0;
    member.activeKeepCount = 0;
    member.bonded = BIGDECIMAL_ZERO;
    member.unboundAvailable = BIGDECIMAL_ZERO;
    member.attributableFaultCount = 0;
    member.involvedInFaultCount = 0;
    member.totalFaultCount = 0;
  }
  return member!;
}
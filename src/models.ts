import {BIGDECIMAL_ZERO, BIGINT_ZERO} from "./constants";
import {Address} from "@graphprotocol/graph-ts/index";
import {Operator, StatsRecord, User} from "../generated/schema";

export function getOrCreateOperator(address: Address): Operator {
  let member = Operator.load(address.toHexString());
  if (member == null) {
    member = new Operator(address.toHexString());
    member.address = address;
    member.totalKeepCount = 0;
    member.activeKeepCount = 0;
    member.bonded = BIGDECIMAL_ZERO;
    member.unboundAvailable = BIGDECIMAL_ZERO;
    member.attributableFaultCount = 0;
    member.involvedInFaultCount = 0;
    member.totalFaultCount = 0;
    member.totalTBTCRewards = BIGDECIMAL_ZERO;
  }
  return member!;
}


export function getOrCreateUser(address: Address): User {
  let id = "u_" + address.toHexString();
  let user = User.load(id);
  if (user == null) {
    user = new User(id);
    user.address = address;
    user.numDepositsCreated = 0
    user.numDepositsRedeemed = 0
    user.numOwnDepositsRedeemed = 0
    user.numDepositsUnfunded = 0
  }
  return user!;
}

export function getStats(): StatsRecord {
  let stats = StatsRecord.load("current");
  if (stats == null) {
    stats = new StatsRecord("current")
    stats.availableToBeBonded = BIGDECIMAL_ZERO
    stats.totalBonded = BIGDECIMAL_ZERO;
    stats.totalBondsSeized = BIGDECIMAL_ZERO;
    stats.btcUnderDeposit = BIGINT_ZERO;
    stats.btcInActiveDeposits = BIGINT_ZERO;
  }
  return stats!;
}
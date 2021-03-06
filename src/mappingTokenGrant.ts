import { BigInt, Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Grant, StakingContractAuthorizedEvent, TokenGrantCreatedEvent, TokenGrantRevokedEvent, TokenGrantStakedEvent, TokenGrantWithdrawnEvent } from "../generated/schema";
import { getStats, getOrCreateOperator } from "./models";
import {
  StakingContractAuthorized,
  TokenGrant,
  TokenGrantCreated,
  TokenGrantRevoked,
  TokenGrantStaked,
  TokenGrantWithdrawn,
} from "../generated/TokenGrant/TokenGrant";
import { getIDFromEvent } from "./utils";
import { completeLogEvent } from "./mapping";

export function handleStakingContractAuthorized(
  event: StakingContractAuthorized
): void {
  let logEvent = new StakingContractAuthorizedEvent(getIDFromEvent(event));
  logEvent.grantManager = event.params.grantManager;
  logEvent.stakingContract = event.params.stakingContract;
  completeLogEvent(logEvent, event);
  logEvent.save();
}

export function handleTokenGrantCreated(event: TokenGrantCreated): void {
  let logEvent = new TokenGrantCreatedEvent(getIDFromEvent(event));
  logEvent.grantID = event.params.id;
  completeLogEvent(logEvent, event);
  logEvent.save();

  let grant = createOrUpdateGrant(
    event.address,
    event.params.id,
    event.block.timestamp,
    event.transaction.hash,
    true
  );

  let stats = getStats();
  stats.totalGrantCount += 1;
  stats.totalGrantIssued = stats.totalGrantIssued.plus(grant.amount);
  stats.save();
}

export function handleTokenGrantRevoked(event: TokenGrantRevoked): void {
  let logEvent = new TokenGrantRevokedEvent(getIDFromEvent(event));
  logEvent.grantID = event.params.id;
  completeLogEvent(logEvent, event);
  logEvent.save();

  createOrUpdateGrant(
    event.address,
    event.params.id,
    event.block.timestamp,
    event.transaction.hash,
    false
  );
}

export function handleTokenGrantStaked(event: TokenGrantStaked): void {
  if(event.block.number.lt(BigInt.fromI32(10834081))){
    return; // Old TokenStaking contract in use
  }
  let member = getOrCreateOperator(event.params.operator);
  let grantId = event.params.grantId.toString()
  let grant = Grant.load(grantId);
  member.owner = grant.grantee;
  member.grant = grantId;
  member.save()

  let logEvent = new TokenGrantStakedEvent(getIDFromEvent(event));
  logEvent.amount = event.params.amount;
  logEvent.grantID = event.params.grantId;
  logEvent.operator = event.params.operator.toHexString();
  completeLogEvent(logEvent, event);
  logEvent.save();

  grant = createOrUpdateGrant(
    event.address,
    event.params.grantId,
    event.block.timestamp,
    event.transaction.hash,
    false
  );
  let grantOperators = grant.operators;
  grantOperators.push(event.params.operator.toHexString())
  grant.operators= grantOperators;
  grant.save()
}

export function handleTokenGrantWithdrawn(event: TokenGrantWithdrawn): void {
  let logEvent = new TokenGrantWithdrawnEvent(getIDFromEvent(event));
  logEvent.amount = event.params.amount;
  logEvent.grantID = event.params.grantId;
  completeLogEvent(logEvent, event);
  logEvent.save();

  createOrUpdateGrant(
    event.address,
    event.params.grantId,
    event.block.timestamp,
    event.transaction.hash,
    false
  );
}

function createOrUpdateGrant(
  address: Address,
  id: BigInt,
  timestamp: BigInt,
  transactionHash: Bytes,
  isTokenGrantCreateEvent: boolean
): Grant {
  let contract = TokenGrant.bind(address);
  let contractGrant = contract.grants(id);

  let grant = Grant.load(id.toString());
  if(grant === null){
    grant = new Grant(id.toString());
    grant.operators = []
    grant.isManaged = false; // Overwritten afterwards
    grant.grantee = contractGrant.value1;
  }
  grant.grantManager = contractGrant.value0;
  grant.revokedAt = contractGrant.value2;
  grant.revokedAmount = contractGrant.value3;
  grant.revokedWithdrawn = contractGrant.value4;
  grant.revocable = contractGrant.value5;
  grant.amount = contractGrant.value6;
  grant.duration = contractGrant.value7;
  grant.start = contractGrant.value8;
  grant.cliff = contractGrant.value9;
  grant.withdrawn = contractGrant.value10;
  grant.staked = contractGrant.value11;
  grant.stakingPolicy = contractGrant.value12;
  grant.timestamp = timestamp;
  if (isTokenGrantCreateEvent) {
    grant.transactionHash = transactionHash;
  }
  grant.save();
  return grant as Grant;
}

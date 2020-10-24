import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  StakingContractAuthorized as StakingContractAuthorizedEvent,
  TokenGrantCreated as TokenGrantCreatedEvent,
  TokenGrantRevoked as TokenGrantRevokedEvent,
  TokenGrantStaked as TokenGrantStakedEvent,
  TokenGrantWithdrawn as TokenGrantWithdrawnEvent,
  TokenGrant,
} from "../generated/TokenGrant/TokenGrant";
import { Grant } from "../generated/schema";
import { getStats } from "./models";

export function handleStakingContractAuthorized(
  event: StakingContractAuthorizedEvent
): void {}

export function handleTokenGrantCreated(event: TokenGrantCreatedEvent): void {
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
  stats.save()
}

export function handleTokenGrantRevoked(event: TokenGrantRevokedEvent): void {
  createOrUpdateGrant(
    event.address,
    event.params.id,
    event.block.timestamp,
    event.transaction.hash,
    false
  );
}

export function handleTokenGrantStaked(event: TokenGrantStakedEvent): void {
  createOrUpdateGrant(
    event.address,
    event.params.grantId,
    event.block.timestamp,
    event.transaction.hash,
    false
  );
}

export function handleTokenGrantWithdrawn(
  event: TokenGrantWithdrawnEvent
): void {
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

  let grant = new Grant(id.toString());
  grant.grantManager = contractGrant.value0;
  grant.grantee = contractGrant.value1;
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
  // grant.isManaged = false; // get from other contract
  grant.timestamp = timestamp;
  if (isTokenGrantCreateEvent) {
    grant.transactionHash = transactionHash;
  }
  grant.save();
  return grant as Grant;
}

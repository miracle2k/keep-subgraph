import {PriceFeed} from "../generated/schema";
import {LogMedianPrice} from "../generated/MedianETHBTC/MedianETHBTC";
import {BigInt, log} from "@graphprotocol/graph-ts";


const ORACLE_ADDRESS = '0x81a679f98b63b3ddf2f17cb5619f4d6775b3c5ed';


export function handleLogMedianPrice(event: LogMedianPrice): void {
  let entity = new PriceFeed(ORACLE_ADDRESS)
  entity.val = event.params.val
  entity.age = event.params.age
  entity.timestamp = event.block.timestamp
  entity.blockNumber = event.block.number
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function getOraclePrice(): BigInt|null {
  // Note: We have to read from our own storage. We cannot read from the contract, it blocks unauthorized reads.
  let feed = PriceFeed.load(ORACLE_ADDRESS);
  if (!feed) {
    log.warning('PriceFeed: has no value yet', [])
    return null;
  }
  return feed.val;
}

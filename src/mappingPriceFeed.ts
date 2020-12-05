import {PriceFeed} from "../generated/schema";
import {LogMedianPrice, MedianETHBTC} from "../generated/MedianETHBTC/MedianETHBTC";
import {Address, BigInt} from "@graphprotocol/graph-ts";


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

export function getOraclePrice(): BigInt {
  let oracle = MedianETHBTC.bind(Address.fromString(ORACLE_ADDRESS));
  return oracle.read();
}
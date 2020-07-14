# Example Queries

### Total ETH actively bonded

```graphql
{
  bondedECDSAKeeps(where: { status: ACTIVE }) {
    keepAddress
    totalBondAmount
  }
}
```

### Total ETH bonded (lifetime)

```graphql
{
  bondedECDSAKeeps(where: { status_not: TERMINATED }) {
    keepAddress
    totalBondAmount
  }
}
```

### TDTs minted at a given day (May 15 2020)

```graphql
{
  tbtcdepositTokens(
    where: { mintedAt_gt: "1589587200", mintedAt_lt: "1589673600" }
  ) {
    tokenID
    owner
    isBurned
  }
}
```

### TBTCs minted at a given day (May 15 2020)

```graphql
{
  tbtctokens(where: { mintedAt_gt: "1589587200", mintedAt_lt: "1589673600" }) {
    id
    mintedAt
    amount
    owner
  }
}
```

### New deposits at a given day (May 15 2020)

```graphql
{
  deposits(where: { createdAt_gt: "1589587200", createdAt_lt: "1589673600" }) {
    contractAddress
    lotSizeSatoshis
    collateralizationPercent
    utxoSize
    currentState
    createdAt
  }
}
```

### Redemptions at a given day (May 15 2020)

```graphql
{
  depositRedemptions(
    where: { redeemedAt_gt: "1589587200", redeemedAt_lt: "1589673600" }
  ) {
    withdrawalRequestAt
    utxoSize
    redeemedAt
    outpoint
    redeemerOutputScript
  }
}
```

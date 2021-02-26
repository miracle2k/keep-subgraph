const nunjucks = require('nunjucks');
const fs = require('fs');


// Real value is the one given in the argument.
// See: https://github.com/graphprotocol/graph-node/issues/2007
function forceMinimumStartBlock(realStartBlock) {
  return '9958365';
}


const mainNetVars = {
  network: 'mainnet',
  'TBTCDepositToken': {
    'address': '0x10B66Bd1e3b5a936B7f8Dbc5976004311037Cdf0',
    'startBlock': '10867845'
  },
  'TBTCToken': {
    'address': '0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa',
    'startBlock': '10867840'
  },
  'KeepBonding': {
    'address': '0x27321f84704a599aB740281E285cc4463d89A3D5',
    'startBlock': forceMinimumStartBlock(10834319),
  },
  'TBTCSystem': {
    'address': '0xe20A5C79b39bC8C363f0f49ADcFa82C2a01ab64a',
    'startBlock': '10867764'
  },
  'TokenStaking': {
    'address': '0x1293a54e160d1cd7075487898d65266081a15458',
    'startBlock': forceMinimumStartBlock(10834080),
  },
  'KeepRandomBeaconOperator': {
    'address': '0xdF708431162Ba247dDaE362D2c919e0fbAfcf9DE',
    'startBlock': '10834116'
  },
  'KeepRandomBeaconService': {
    'address': '0x50510E691c90EA098e3fdd23C311731BF394aAFd',
    'startBlock': '10834104'
  },
  "MedianETHBTC": {
    'address': '0x81a679f98b63b3ddf2f17cb5619f4d6775b3c5ed',
    // This starts long before us, but we don't care to do it earlier than the start of our system.
    // We are lucky that between that system start and the first LogMediumEvent the price is not needed.
    // Strictly speaking, we should go for the first LogMedian event *before* that time.

    // TODO: still not sure why this sometimes triggers the "PriceFeed: has no value yet" warning.
    'startBlock': forceMinimumStartBlock(9849211)
  },
  'TokenGrant': {
    'address': '0x175989c71Fd023D580C65F5dC214002687ff88B7',
    'startBlock': '9958365'
  },
  'ECDSARewards': {
    'address': '0xc5aC5A8892230E0A3e1c473881A2de7353fFcA88',
    'startBlock': forceMinimumStartBlock(11193245)
  },
  'BeaconRewards': {
    'address': '0xBF51807ACb3394B8550f0554FB9098856Ef5F491',
    'startBlock': forceMinimumStartBlock(11192879),
  },
  'ECDSARewardsDistributor': {
    'address': '0x5b9E48F8818962699fe38F5989b130ceE691bBb3',
    'startBlock': forceMinimumStartBlock(11432833),
  },
  'TokenStakingEscrow': {
    'address': '0xDa534b567099Ca481384133bC121D5843F681365',
    'startBlock': forceMinimumStartBlock(10834074),
  },
  'ManagedGrantFactory': {
    'address': '0x43cf9E26857B188868051bDcFAcEdBB38531964E',
    'startBlock': forceMinimumStartBlock(9958367),
  },
  'StakingPortBacker': {
    'address': '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
    'startBlock': forceMinimumStartBlock(10834081),
  },
}

const ropstenVars = {
  network: 'ropsten',
  'TBTCDepositToken': {
    'address': '0x777eceE852Ab7517d2537726b0e4685339701ea9',
    'startBlock': '9421711'
  },
  'TBTCToken': {
    'address': '0x8661B93F1508e01e30D1679cE7817A04fEE2163C',
    'startBlock': '9421707'
  },
  'KeepBonding': {
    'address': '0xef3A39A22E2D71f8967B977351e7301CaCB5A254',
    'startBlock': '9420578'
  },
  'TBTCSystem': {
    'address': '0xA41ffe9d9BAD45aD884e5100E6e201854912373E',
    'startBlock': '9421660'
  },
  'TokenStaking': {
    'address': '0x3D6Ef582590D75d1fBe63B379f626DA1f5b2f810',
    'startBlock': '9403344'
  },
  'KeepRandomBeaconOperator': {
    'address': '0x89361Bd4E69C72194CDcAEcEA3A4df525F22Cb03',
    'startBlock': '9403375'
  },
  'KeepRandomBeaconService': {
    'address': '0x0D3735ED83F812417af32CEDD09772b0Ec43dAf6',
    'startBlock': '9403373'
  },
  'TokenGrant': {
    'address': '0x474c370C78526257D3e03816Fd3b3b260523CD01',
    'startBlock': '9403327'
  },
  'TokenStakingEscrow': {
    'address': '0xF2fa678bfF7Ac1F1c62F9C8221604e6CFb16F635',
    'startBlock': '9403331',
  },
  'ManagedGrantFactory': {
    'address': '0xf61bb6F3227B3f19b0d8d365c6743E525A565fCE',
    'startBlock': '9403356',
  },
  'StakingPortBacker': {
    'address': '0x574C4a62366a30F2f53eff394128503f0919011C',
    'startBlock': '9403349',
  },
}

const templateString = fs.readFileSync('subgraph.template.yaml', 'utf8').toString();

console.log("Writing subgraph.yaml")
fs.writeFileSync('subgraph.yaml', nunjucks.renderString(templateString, mainNetVars))
console.log("Writing subgraph.ropsten.yaml")
fs.writeFileSync('subgraph.ropsten.yaml', nunjucks.renderString(templateString, ropstenVars))
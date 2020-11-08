const nunjucks = require('nunjucks');
const fs = require('fs');

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
    'startBlock': '10834319'
  },
  'TBTCSystem': {
    'address': '0xe20A5C79b39bC8C363f0f49ADcFa82C2a01ab64a',
    'startBlock': '10867764'
  },
  'TokenStaking': {
    'address': '0x1293a54e160d1cd7075487898d65266081a15458',
    'startBlock': '10834080'
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
    'startBlock': '10941427'
  },
  'TokenGrant': {
    'address': '0x175989c71Fd023D580C65F5dC214002687ff88B7',
    'startBlock': '9958365'
  },
  'ECDSARewards': {
    'address': '0xc5aC5A8892230E0A3e1c473881A2de7353fFcA88',
    'startBlock': '11193245'
  },
  'BeaconRewards': {
    'address': '0xBF51807ACb3394B8550f0554FB9098856Ef5F491',
    'startBlock': '11192879'
  }
}

const ropstenVars = {
  network: 'ropsten',
  'TBTCDepositToken': {
    'address': '0x7cAad48DF199Cd661762485fc44126F4Fe8A58C9',
    'startBlock': '8595001'
  },
  'TBTCToken': {
    'address': '0x7c07C42973047223F80C4A69Bb62D5195460Eb5F',
    'startBlock': '8594999'
  },
  'KeepBonding': {
    'address': '0x60535A59B4e71F908f3fEB0116F450703FB35eD8',
    'startBlock': '8593098'
  },
  'TBTCSystem': {
    'address': '0xc3f96306eDabACEa249D2D22Ec65697f38c6Da69',
    'startBlock': '8594981'
  },
  'TokenStaking': {
    'address': '0x234d2182B29c6a64ce3ab6940037b5C8FdAB608e',
    'startBlock': '8580771'
  },
  'KeepRandomBeaconOperator': {
    'address': '0xC8337a94a50d16191513dEF4D1e61A6886BF410f',
    'startBlock': '8580806'
  },
  'KeepRandomBeaconService': {
    'address': '0x6c04499B595efdc28CdbEd3f9ed2E83d7dCCC717',
    'startBlock': '8580802'
  },
  'TokenGrant': {
    'address': '0xb64649fe00f8Ef5187d09d109C6F38f13C7CF857',
    'startBlock': '8580756'
  }
}

const templateString = fs.readFileSync('subgraph.template.yaml', 'utf8').toString();

console.log("Writing subgraph.yaml")
fs.writeFileSync('subgraph.yaml', nunjucks.renderString(templateString, mainNetVars))
console.log("Writing subgraph.ropsten.yaml")
fs.writeFileSync('subgraph.ropsten.yaml', nunjucks.renderString(templateString, ropstenVars))
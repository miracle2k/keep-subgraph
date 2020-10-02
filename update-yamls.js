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
  }
}

const templateString = fs.readFileSync('subgraph.template.yaml', 'utf8').toString();

console.log("Writing subgraph.yaml")
fs.writeFileSync('subgraph.yaml', nunjucks.renderString(templateString, mainNetVars))
console.log("Writing subgraph.ropsten.yaml")
fs.writeFileSync('subgraph.ropsten.yaml', nunjucks.renderString(templateString, ropstenVars))
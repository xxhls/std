/**
 * typescript 检查，参考 https://learning-notes.mistermicheels.com/javascript/typescript/compiler-api
 */
const { isInstalled, execNpmScript, print } = require('../utils');

/**
 * typescript 检查
 * @type {import("./type").Task}
 */
async function typeScriptRunner(ctx) {
  const {
    config: { typescriptEnable = false, typescriptCmd = 'tsc --noEmit' },
  } = ctx;

  if (!typescriptEnable || !isInstalled('typescript')) {
    return;
  }

  print('Info', '正在执行 typescript 检查');

  execNpmScript(typescriptCmd);
}

module.exports = typeScriptRunner;

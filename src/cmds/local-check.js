const { run } = require('../tasks');
const { getStagedFiles, getUnstagedFiles } = require('../utils');

/**
 *
 * @param {*} options
 * @returns
 */
async function exec(options) {
  if (process.env.WK_NO_VERIFY === 'true') {
    console.warn('警告：正使用 WK_NO_VERIFY 绕过本地审核');
    return;
  }

  const stagedFiles = getStagedFiles();
  const unstagedFiles = getUnstagedFiles();
  await run({ fixable: true, files: stagedFiles, unstagedFiles, options });
}

module.exports = exec;

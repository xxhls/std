const {
  print,
  STYLE_SUPPORT_EXTENSIONS,
  fileFilter,
  getSafeChangeableFiles,
  stageFiles,
  isInstalled,
} = require('../utils');

/**
 * @type {import("./type").Task}
 * stylelint 检查
 */
async function stylelintRunner(ctx) {
  // 未安装 stylelint 跳过检查, 向下兼容
  if (!isInstalled('stylelint')) {
    return;
  }

  const {
    files,
    unstagedFiles,
    fixable,
    config: { stylePatterns, stylelintEnable, stylelintFixable, stylelintArgs = {} },
  } = ctx;
  const fixEnabled = !!(fixable && stylelintFixable);

  if (!stylelintEnable) {
    return;
  }

  if (typeof stylelintArgs !== 'object') {
    print(
      'Error',
      `stylelintArgs 期望接收一个参数对象(https://stylelint.io/user-guide/usage/options), 现在接收的是: ${stylelintArgs}, 请进行迁移`
    );
    process.exit(-1);
  }

  const filtered = fileFilter(files, STYLE_SUPPORT_EXTENSIONS, stylePatterns);
  if (!filtered.length) {
    print('Info', '没有文件需要 stylelint 检查, 跳过');
    return;
  }

  print('Info', '正在执行 stylelint 检查');
  print('Debug', '变动文件: \n' + filtered.map(i => `\t ${i}`).join('\n') + '\n');

  /**
   *
   * @param {string[]} filesToLint
   * @param {boolean} fix
   * @param {object} args
   */
  const lint = async (filesToLint, fix, args) => {
    const stylelint = require('stylelint');

    try {
      const res = await stylelint.lint({
        fix,
        files: filesToLint,
        formatter: 'string',
        ...args,
      });

      if (res.errored) {
        // 暂时不支持 warning 清洗
        console.log(res.output);
        throw new Error('Stylelint 检查未通过');
      }
    } catch (err) {
      if (err.message && err.message.indexOf('No files matching the pattern') !== -1) {
        // ignore
      } else {
        throw err;
      }
    }
  };

  if (!fixEnabled) {
    // 纯 lint
    await lint(filtered, fixEnabled, stylelintArgs);
    return;
  }

  const { safe, unsafe } = getSafeChangeableFiles(filtered, unstagedFiles);

  if (safe.length) {
    await lint(safe, fixEnabled, stylelintArgs);
    stageFiles(safe);
  }

  if (unsafe.length) {
    print(
      'Error',
      `下列文件不能被安全地进行 stylelint fix，请完成编辑并 stage(git add) 后重试: \n ${unsafe
        .map(i => `\t ${i}`)
        .join('\n')}\n\n`
    );
    process.exit(1);
  }
}

module.exports = stylelintRunner;

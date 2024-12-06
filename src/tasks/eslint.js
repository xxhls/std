const { ESLint } = require('eslint');
const { print, SCRIPT_SUPPORT_EXTENSIONS, fileFilter, getSafeChangeableFiles, stageFiles } = require('../utils');

/**
 * ESLint错误信息显示限制
 */
const MAX_MESSAGE_LENGTH = 50;

/**
 * @param {string[]} files
 * @param {boolean} fixable
 * @param {object} args
 */
async function lint(files, fixable, args) {
  const eslint = new ESLint({
    fix: fixable,
    fixTypes: fixable ? ['problem', 'suggestion'] : undefined,
    errorOnUnmatchedPattern: false,
    ...args,
  });

  /**
   * @type {string[]}
   */
  const extraText = [];

  const results = await eslint.lintFiles(files);

  if (fixable) {
    await ESLint.outputFixes(results);
  }

  const errorOnlyResults = results.filter(i => {
    // 过滤掉只有 warning 的文件
    return !!i.errorCount;
  });

  if (errorOnlyResults.length) {
    // warning 信息清洗
    errorOnlyResults.forEach(i => {
      i.messages = i.messages.filter(m => m.severity === 2);
      i.warningCount = 0;

      if (i.messages.length > MAX_MESSAGE_LENGTH) {
        extraText.push(`文件 ${i.filePath} 存在 ${i.messages.length} 个错误`);
        i.messages.length = MAX_MESSAGE_LENGTH;
      }
    });

    const formatter = await eslint.loadFormatter('table');
    const resultText = formatter.format(errorOnlyResults);
    console.log(resultText);
    console.log(extraText.join('\n'));
    throw new Error('Eslint 检查未通过');
  }
}

/**
 * eslint 检查
 * @type {import("./type").Task}
 */
async function eslintRunner(ctx) {
  const {
    files,
    unstagedFiles,
    fixable,
    config: { scriptPatterns, eslintArgs = {}, eslintFixable = true },
  } = ctx;

  const fixEnabled = fixable && eslintFixable;

  if (typeof eslintArgs !== 'object') {
    print(
      'Error',
      `eslintArgs 期望接收一个参数对象(https://eslint.org/docs/developer-guide/nodejs-api#-new-eslintoptions), 现在接收的是: ${eslintArgs}, 请进行迁移`
    );
    process.exit(-1);
  }

  const filtered = fileFilter(files, SCRIPT_SUPPORT_EXTENSIONS, scriptPatterns);
  if (!filtered.length) {
    print('Info', '没有文件需要 eslint 检查, 跳过');
    return;
  }

  print('Info', '正在执行 eslint 检查');
  print('Debug', '变动文件: \n' + filtered.map(i => `\t ${i}`).join('\n') + '\n');

  if (!fixEnabled) {
    // 纯 lint
    await lint(filtered, fixEnabled, eslintArgs);
    return;
  }

  const { safe, unsafe } = getSafeChangeableFiles(filtered, unstagedFiles);

  if (safe.length) {
    await lint(safe, fixEnabled, eslintArgs);
    stageFiles(safe);
  }

  if (unsafe.length) {
    print(
      'Error',
      `下列文件不能被安全地进行 eslint fix，请完成编辑并 stage(git add) 后重试: \n ${unsafe
        .map(i => `\t ${i}`)
        .join('\n')}\n\n`
    );
    process.exit(1);
  }
}

module.exports = eslintRunner;

const prettier = require('prettier');
const fsSync = require('fs');
const fs = require('fs').promises;
const ignore = require('ignore').default;
const path = require('path');
const { fileFilter, print, stageFiles, getSafeChangeableFiles } = require('../utils');

/**
 * @type {string[]}
 */
const PRETTIER_SUPPORT_EXTENSIONS = prettier.getSupportInfo().languages.reduce(
  // @ts-expect-error
  (prev, language) => prev.concat(language.extensions || []),
  []
);

/**
 * 创建过滤器
 * @param {string} workDir
 * @param {string} filename
 * @returns {(p: string) =>  boolean}
 */
const createIgnoreFilter = (workDir, filename = '.prettierignore') => {
  const file = path.join(workDir, filename);
  if (fsSync.existsSync(file)) {
    const content = fsSync.readFileSync(file, 'utf-8');
    const filter = ignore().add(content).createFilter();
    return filter;
  }

  return () => true;
};

/**
 *
 * @param {string[]} files
 * @param {object} args
 */
async function prettierFiles(files, args) {
  if (files.length == null) {
    return;
  }

  const options = { ...((await prettier.resolveConfig(files[0])) || {}), ...args };

  await Promise.all(
    files.map(async file => {
      const source = (await fs.readFile(file)).toString();
      const formatted = prettier.format(source, { ...options, filepath: file });
      if (source !== formatted) {
        await fs.writeFile(file, formatted);
      }
    })
  );
}

/**
 * @type {import("./type").Task}
 */
async function pretty(ctx) {
  const {
    files,
    unstagedFiles,
    config: { formatPatterns, prettierArgs = {} },
    fixable,
    failed,
    ignoreFailed,
    cwd,
  } = ctx;

  if (failed && !ignoreFailed) {
    print('Warn', '上游任务存在错误，跳过 prettier, 请修复错误后重试');
    return;
  }

  if (!fixable) {
    return;
  }

  if (typeof prettierArgs !== 'object') {
    print(
      'Error',
      `prettierArgs 期望接收一个参数对象(https://prettier.io/docs/en/options.html), 现在接收的是: ${prettierArgs}, 请进行迁移`
    );
    process.exit(-1);
  }

  let filtered = fileFilter(files, PRETTIER_SUPPORT_EXTENSIONS, formatPatterns);

  const ignoreFilter = createIgnoreFilter(cwd);
  filtered = filtered.filter(ignoreFilter);

  if (!filtered.length) {
    print('Info', '没有文件支持 prettier 格式化, 跳过');
    return;
  }

  print('Info', '正在执行 prettier 格式化');
  print('Debug', '变动文件: \n' + filtered.map(i => `\t ${i}`).join('\n') + '\n');
  const { safe, unsafe } = getSafeChangeableFiles(filtered, unstagedFiles);

  if (safe.length) {
    await prettierFiles(safe, prettierArgs);
    stageFiles(safe);
  }

  if (unsafe.length) {
    print(
      'Error',
      `下列文件不能被安全地格式化，请完成编辑并 stage(git add) 后重试: \n ${unsafe.map(i => `\t ${i}`).join('\n')}\n\n`
    );
    process.exit(1);
  }
}

module.exports = pretty;

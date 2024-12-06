const pre = require('./pre');
const typescript = require('./typescript');
const eslint = require('./eslint');
const stylelint = require('./stylelint');
const pretty = require('./pretty');
const post = require('./post');

module.exports = {
  defaultTasks: [pre, typescript, eslint, stylelint, pretty, post],
  pre,
  typescript,
  eslint,
  stylelint,
  pretty,
  post,
};

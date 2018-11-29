const path = require('path');
const BB = require("bluebird");
const webpack = BB.promisify(require("webpack"));
const fse = require('fs-extra');

module.exports = {
  pack: async function(serverless, functionObject) {
    serverless.cli.log(`bundling: ${functionObject.script}`);

    let outputPath = path.join(serverless.config.servicePath, functionObject.script);

    let config = {
      entry: {
        out: outputPath
      },
      output: {
        filename: `${functionObject.script}.js`,
        path: path.join(serverless.config.servicePath, 'dist'),
      },
      devtool: 'cheap-module-source-map',
      target: 'webworker',
      mode: 'production'
    }
    await webpack(config);
    
    functionObject.script = `dist/${functionObject.script}`;
    fse.removeSync(outputPath);
  }
}
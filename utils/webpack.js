const path = require('path');
const BB = require("bluebird");
const webpack = BB.promisify(require("webpack"));
const fse = require('fs-extra');

module.exports = {
  pack: async function(serverless, functionObject) {
    serverless.cli.log(`bundling: ${functionObject.script}`);

    let outputPath = path.join(serverless.config.servicePath, functionObject.script);
    let webpackConfig = functionObject.webpack;

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

    try {
      // Check whether webpackConfig is a string
      if (typeof webpackConfig == 'string') {
        let configPath = path.join(serverless.config.servicePath, webpackConfig);
        let fileConfig = require(configPath);
        config = Object.assign(config, fileConfig);
      }
      let result = await webpack(config);
      let errors = result.compilation.errors;
      if (Array.isArray(errors) && errors) {
        errors.forEach(error => {
          console.log(`Webpack Error: ${error}`);
        })
      }
    } catch(error) {
      // failed to webpack
      console.log(`Webpack Error: ${error}`);
    }

    functionObject.script = `dist/${functionObject.script}`;
    fse.removeSync(outputPath);
  }
}
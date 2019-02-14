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

    // Check whether webpackConfig is an object
    if (webpackConfig === Object(webpackConfig)) {
      config = Object.assign(config, webpackConfig);
    }
    try {
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
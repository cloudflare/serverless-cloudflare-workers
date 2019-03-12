const path = require("path");
const BB = require("bluebird");
const webpack = BB.promisify(require("webpack"));
const fse = require("fs-extra");

function getDefaultWebPackConfig(serverless, functionObject) {
  const outputPath = path.join(
    serverless.config.servicePath,
    functionObject.script
  );

  return {
    config: {
      entry: {
        out: outputPath
      },
      output: {
        filename: `${functionObject.script}.js`,
        path: path.join(serverless.config.servicePath, "dist")
      },
      devtool: "cheap-module-source-map",
      target: "webworker",
      mode: "production"
    },
    outputPath
  };
}

async function build(config) {
  try {
    let result = await webpack(config);
    let errors = result.compilation.errors;
    if (Array.isArray(errors) && errors) {
      errors.forEach(error => {
        console.log(`Webpack Error: ${error}`);
      });
    }
  } catch (error) {
    // failed to webpack
    console.log(`Webpack Error: ${error}`);
  }
}

module.exports = {
  pack: async function (serverless, functionObject, webpackConfigFile = null) {
    serverless.cli.log(`bundling: ${functionObject.script}`);
    const startTime = Date.now()
    let config = null, outputPath = '';

    //If webpack config file is provided use that
    if (webpackConfigFile && typeof webpackConfigFile === 'string') {
      console.log(`Building web pack with config ${webpackConfigFile}.js`)
      config = require(path.resolve("./" + webpackConfigFile));
    } else if (typeof (functionObject.webpack) === 'boolean' && functionObject.webpack) {
      //webpack is set to true in function object. Let's generate bundle for just this function
      console.log(`Building web pack with config default config for ${functionObject.script}`);
      ({ config, outputPath } = getDefaultWebPackConfig(serverless, functionObject));
    } else if (typeof (functionObject.webpack) === 'string' && functionObject.webpack) {
      //function has individual webpack config. Build that
      console.log(`Building web pack with config file ${functionObject.webpack} for ${functionObject.script}`);
      ({ config } = getDefaultWebPackConfig(serverless, functionObject));
      config = Object.assign(config, require(path.resolve("./" + functionObject.webpack)));
    }

    if (!config) {
      //No config found, probably did a global webpack build. Exit
      return
    }

    await build(config)

    console.log(`Webpack finished in ${(Date.now() - startTime) / 1000} seconds`)
    if (outputPath) {
      fse.removeSync(outputPath);
    }

  },

  packGlobalWebpack: async function (serverless) {
    // Let's see if there is global webpack that we need to build
    const globalWebPackConfig = serverless.service.serviceObject.webpackConfig;
    if (globalWebPackConfig && typeof globalWebPackConfig === 'string') {
      await this.pack(serverless, { script: 'Global web pack config' }, globalWebPackConfig);
    }
  },


  getAssetPathPrefix: function (serverless, functionObject) {
    // If web pack is used and not explicitly turned off for this script, append dist in-front of the path
    return (serverless.service.serviceObject.webpackConfig || functionObject.webpack) &&
      functionObject.webpack !== false ?
      './dist/' : '';
  }
};

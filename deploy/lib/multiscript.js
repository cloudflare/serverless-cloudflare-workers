/**
 * Copyright (c) 2018, Cloudflare. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 *  1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *  2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *  3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
const path = require('path');
const sdk = require("../../provider/sdk");
const { generateCode } = require("./workerScript");
const BB = require("bluebird");
const webpack = BB.promisify(require("webpack"));
const fse = require('fs-extra');

module.exports = {
  async multiScriptWorkerAPI(scriptContents, scriptName) {
    const { accountId } = this.provider.config;
    return await sdk.cfApiCall({
      url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`,
      method: `PUT`,
      contentType: `application/javascript`,
      body: scriptContents
    });
  },

  async multiScriptRoutesAPI(pattern, scriptName, zoneId) {
    const payload = { pattern, script: scriptName };
    return await sdk.cfApiCall({
      url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
      method: `POST`,
      contentType: `application/json`,
      body: JSON.stringify(payload)
    });
  },

  async getRoutesMultiScript(zoneId) {
    return await sdk.cfApiCall({
      url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
      method: `GET`,
      contentType: `application/javascript`
    });
  },
  async multiScriptDeploy(funcObj) {
    return await BB.bind(this).then(async () => {
      const { workers: scriptOptions, zoneId } = this.provider.config;

      if (scriptOptions === undefined || scriptOptions === null) {
        throw new Error(
          "Incorrect template being used for a MultiScript user "
        );
      }

      let workerScriptResponse;
      let routesResponse = [];
      const scriptContents = generateCode(funcObj);

      const { worker: scriptName } = funcObj;

      const response = await this.multiScriptWorkerAPI(
        scriptContents,
        scriptName
      );
      workerScriptResponse = response;
      const allRoutes = scriptOptions[scriptName]["routes"];

      for (const pattern of allRoutes) {
        this.serverless.cli.log(`deploying route: ${pattern} `);
        const rResponse = await this.multiScriptRoutesAPI(
          pattern,
          scriptName,
          zoneId
        );
        routesResponse.push(rResponse);
      }

      return {
        workerScriptResponse,
        routesResponse
      };
    });
  },

  async multiScriptDeployAll() {
        
    const { workers: scriptOptions } = this.provider.config;
    if (scriptOptions === undefined || scriptOptions === null) {
      throw new Error("Incorrect template being used for a MultiScript user ");
    }
    const scriptNames = Object.keys(scriptOptions);
    let workerResponse = [];
    let routesResponse = [];

    for (const scriptName of scriptNames) {
      const functionObject = this.getFunctionObjectFromScriptName(scriptName);

      if (this.provider.config.webpack) {

        this.serverless.cli.log(`bundling: ${functionObject.script}`);
        let outputPath = path.join(this.serverless.config.servicePath, functionObject.script);

        let config = {
          entry: {
            out: outputPath
          },
          output: {
            filename: `${functionObject.script}.js`,
            path: path.join(this.serverless.config.servicePath, 'dist'),
          },
          devtool: 'cheap-module-source-map',
          target: 'web'
        }
        await webpack(config);
        
        functionObject.script = `dist/${functionObject.script}`;
        fse.removeSync(outputPath);
      }

      this.serverless.cli.log(`deploying script: ${scriptName}`);
      const {
        workerScriptResponse,
        routesResponse: rResponse
      } = await this.multiScriptDeploy(functionObject);
      workerResponse.push(workerScriptResponse);
      routesResponse.push(rResponse);
    }

    return {
      workerScriptResponse: workerResponse,
      routesResponse,
      isMultiScript: true
    };
  }
};

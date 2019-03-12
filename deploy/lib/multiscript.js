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
const BB = require("bluebird");
const webpack = require("../../utils/webpack");
const ms = require("../../shared/multiscript");

module.exports = {
  async deployScriptToCloudflare(functionObject) {
    return BB.bind(this)
      .then(async () => {

        if (functionObject.webpack) {
          await webpack.pack(this.serverless, functionObject);
        }

        // deploy script, routes, and namespaces
        const namespaceResponse = await ms.deployNamespaces(this.provider.config.accountId, functionObject);
        const workerScriptResponse = await ms.deployWorker(this.provider.config.accountId, this.serverless, functionObject);
        const routesResponse = await ms.deployRoutes(this.provider.config.zoneId, functionObject);

        return {
          workerScriptResponse,
          routesResponse,
          namespaceResponse
        };
      });
  },


  async  deployScript(scriptName) {
    const startScriptTime = Date.now();
    const functionObject = this.getFunctionObject(scriptName);

    this.serverless.cli.log(`deploying script: ${scriptName}`);
    const {
      workerScriptResponse,
      routesResponse: rResponse,
      namespaceResponse,
    } = await this.deployScriptToCloudflare(functionObject, scriptName);

    this.serverless.cli.log(`Finished deployment ${scriptName} in ${(Date.now() - startScriptTime) / 1000} seconds`);
    return { workerResponse: workerScriptResponse, routesResponse: rResponse, namespaceResponse }
  },

  /**
   * Deploy functions passed in or all functions if no functions are submitted
   * 
   * @param {Array[string]} functions 
   */
  async multiScriptDeployAll(functions = null) {

    functions = functions || this.serverless.service.getAllFunctions();

    if (typeof (functions) === 'undefined' || functions === null) {
      throw new Error("Incorrect template being used for a MultiScript user ");
    }

    let workerResponse = [];
    let routesResponse = [];
    let namespaceResponses = [];

    // Build global webpack if available
    await webpack.packGlobalWebpack(this.serverless)

    this.serverless.cli.log('Starting deployment');

    // scriptName is really the key of the function map
    for (const name of functions) {
      const result = await this.deployScript(name);
      workerResponse.push(result.workerResponse)
      routesResponse.push(result.routesResponse)
      namespaceResponses.push(result.namespaceResponse)
    }

    return {
      workerScriptResponse: workerResponse,
      routesResponse,
      namespaceResponses,
      isMultiScript: true
    };
  }
};

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
const allScripts = require("../../shared/allScripts");

module.exports = {
  async multiScriptDeploy(functionObject) {
    return BB.bind(this)
    .then(async () => {

      if (functionObject.webpack) {
        await webpack.pack(this.serverless, functionObject);
      }
      
      // deploy script, routes, and namespaces
      const namespaceResponse = await allScripts.deployNamespaces(this.provider.config.accountId, functionObject);
      const workerScriptResponse = await allScripts.deployEnterpriseWorker(this.provider.config.accountId, functionObject);
      const routesResponse = await allScripts.deployRoutes(this.provider.config.zoneId, functionObject);

      return {
        workerScriptResponse,
        routesResponse,
        namespaceResponse
      };
    });
  },

  async multiScriptDeployAll() {

    const functions = this.serverless.service.getAllFunctions();

    if (typeof(functions) === 'undefined' || functions === null) {
      throw new Error("Incorrect template being used for a MultiScript user ");
    }

    let workerResponse = [];
    let routesResponse = [];
    let namespaceResponses = [];

    // scriptName is really the key of the function map
    for (const scriptName of functions) {
      const functionObject = this.getFunctionObject(scriptName);

      this.serverless.cli.log(`deploying script: ${scriptName}`);

      const {
        workerScriptResponse,
        routesResponse: rResponse,
        namespaceResponse,
      } = await this.multiScriptDeploy(functionObject);

      workerResponse.push(workerScriptResponse);
      routesResponse.push(rResponse);
      namespaceResponses.push(namespaceResponse);
    }

    return {
      workerScriptResponse: workerResponse,
      routesResponse,
      namespaceResponses,
      isMultiScript: true
    };
  }
};

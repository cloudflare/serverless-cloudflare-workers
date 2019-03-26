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
const sdk = require("../../provider/sdk");
const { generateCode, generateWASM } = require("./workerScript");
const BB = require("bluebird");
const webpack = require("../../utils/webpack");
const cf = require("cloudflare-workers-toolkit");
const ms = require("../../shared/multiscript");

module.exports = {

  async singleServeRoutesAPI({ pattern, zoneId }) {
    const payload = { pattern, enabled: true };
    return await sdk.cfApiCall({
      url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/filters`,
      method: `POST`,
      contentType: `application/json`,
      body: JSON.stringify(payload)
    });
  },

  async getRoutesSingleScript(zoneId) {
    return sdk.cfApiCall({
      url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/filters`,
      method: `GET`
    });
  },

  collectRoutes(events) {
    return events.map(event => {
      if (event.http) {
        return event.http.url;
      }
    })
  },

  /**
   * Deploys a single script zone which can only have one script per zone.
   * Because of this the name field is omitted.
   * Also, zoneId must be used since it is required to deploy a single script.
   * @param {*} functionObject 
   */
  async deploySingleScript(functionObject) {
    return await BB.bind(this).then(async () => {
      const { zoneId } = this.provider.config;

      const singleScriptRoutes = this.collectRoutes(functionObject.events);
      let workerScriptResponse;
      let routesResponse = [];

      // Build global webpack if available
      await webpack.packGlobalWebpack(this.serverless)

      // If a local webpack config defined, do that too
      if (functionObject.webpack) {
        await webpack.pack(this.serverless, functionObject);
      }

      const scriptContents = generateCode(this.serverless, functionObject);

      cf.setAccountId(this.provider.config.accountId);
      const namespaceResponse = await ms.deployNamespaces(this.provider.config.accountId, functionObject);
      let bindings = await ms.getBindings(this.provider, functionObject)

      const response = await cf.workers.deploy({
        accountId: this.provider.config.accountId,
        zoneId,
        script: scriptContents,
        wasm: generateWASM(functionObject),
        bindings
      });

      workerScriptResponse = response;

      for (const pattern of singleScriptRoutes) {
        this.serverless.cli.log(`deploying route: ${pattern}`);
        const rResponse = await this.singleServeRoutesAPI({
          pattern,
          zoneId
        });

        routesResponse.push(rResponse);
      }

      return {
        namespaceResponse,
        workerScriptResponse,
        routesResponse,
        isMultiScript: false
      };
    });
  }
};

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
const { generateCode } = require("./workerScript");
const BB = require("bluebird");

module.exports = {
  async singleServeWorkerAPI(scriptContents) {
    const { zoneId } = this.provider.config;
    return await sdk.cfApiCall({
      url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/script`,
      method: `PUT`,
      contentType: `application/javascript`,
      body: scriptContents
    });
  },

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
  async deploySingleScript(funcObj) {
    return await BB.bind(this).then(async () => {
      //const { routes: singleScriptRoutes, zoneId } = this.provider.config;

      const { workers: scriptOptions, zoneId } = this.provider.config;

      const { worker: scriptName } = funcObj;

      const singleScriptRoutes = scriptOptions[scriptName]["routes"];
      let workerScriptResponse;
      let routesResponse = [];
      const scriptContents = generateCode(funcObj);

      const response = await this.singleServeWorkerAPI(scriptContents);
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
        workerScriptResponse,
        routesResponse,
        isMultiScript: false
      };
    });
  }
};

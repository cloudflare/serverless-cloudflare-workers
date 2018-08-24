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
const ms = require("./lib/multiscript");
const ss = require("./lib/singlescript");
const sdk = require("../provider/sdk");
const accountType = require("../shared/accountType");

class CloudflareRemove {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider("cloudflare");
    Object.assign(this, accountType);
    this.hooks = {
      "remove:remove": () =>
        BB.bind(this)
          .then(this.remove)
          .then(resp => console.log("Removed"))
    };
  }

  async remove() {
    const {
      accountId,
      zoneId,
      workers: scriptOptions,
      routes: singleScriptEnabled
    } = this.provider.config;

    const multiscriptEnabled = await this.checkAccountType();

    if (multiscriptEnabled) {
      if (scriptOptions === undefined || scriptOptions === null) {
        throw new Error(
          "Incorrect template being used for a MultiScript user "
        );
      }
      const scriptNames = Object.keys(scriptOptions);

      const { success, result, errors } = await sdk.cfApiCall({
        url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
        contentType: `application/javascript`
      });
      let allRoutes = {};
      if (success) {
        result.forEach(r => {
          try {
            allRoutes[r.script].push(r.id);
          } catch (err) {
            allRoutes[r.script] = [r.id];
          }
        });
      } else if (errors) {
        throw new Error(errors);
      }

      const promises = [];
      scriptNames.forEach(scriptName => {
        allRoutes[scriptName].forEach(routeId => {
          promises.push(ms.removeRoute(zoneId, routeId));
        });
        promises.push(ms.removeScript(accountId, scriptName));
      });
      await Promise.all(promises);
    } else {
      await Promise.all([ss.removeScript(accountId), ss.removeRoutes(zoneId)]);
    }
    this.serverless.cli.log("removed routes + scripts");
    return true;
  }
}
module.exports = CloudflareRemove;

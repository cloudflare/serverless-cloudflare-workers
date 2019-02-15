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
const ss = require("./lib/singlescript");
const accountType = require("../shared/accountType");
const cf = require("cloudflare-workers-toolkit");
const utils = require("../utils");

class CloudflareRemove {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.provider = this.serverless.getProvider("cloudflare");
    // TODO: refactor out Object assigns. they lead to difficult code
    Object.assign(this, accountType, utils);
    this.hooks = {
      "remove:remove": () => {
        if (this.options.function || this.options.f) {
          throw new Error("This does not support -f yet.")
        }
        BB.bind(this)
          .then(this.remove)
          .then(resp => console.log("Removed"))
      }
    };
  }

  async remove() {
    const {
      accountId,
      zoneId,
      routes: singleScriptEnabled
    } = this.provider.config;

    const functionKeys = this.serverless.service.getAllFunctions();
    const multiscriptEnabled = await this.checkAccountType();

    if (multiscriptEnabled) {
      if (functionKeys === undefined || functionKeys === null) {
        throw new Error(
          "Incorrect template being used for a MultiScript user "
        );
      }

      const { success, result, errors } = await cf.routes.getRoutes({zoneId});
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
      functionKeys.forEach(functionKey => {
        let serviceName = this.getFunctionObject(functionKey).name;
        allRoutes[serviceName].forEach(routeId => {
          promises.push(cf.routes.remove({zoneId, routeId}));
        });
        promises.push(cf.workers.remove({accountId, name: serviceName}));
      });
      await Promise.all(promises);
    } else {
      await Promise.all([cf.workers.remove({zoneId: this.provider.config.zoneId}), ss.removeRoutes(zoneId)]);
    }
    this.serverless.cli.log("removed routes + scripts");
    return true;
  }
}
module.exports = CloudflareRemove;

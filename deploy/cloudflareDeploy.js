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

const accountType = require("../shared/accountType");
const logs = require("./lib/logResponse");
const utils = require("../utils");
const validate = require("../shared/validate");
const duplicate = require("../shared/duplicate");

class CloudflareDeploy {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};
    this.provider = this.serverless.getProvider("cloudflare");

    Object.assign(this, accountType, ms, utils, ss, logs, validate);

    const startTime = Date.now();

    this.hooks = {
      "deploy:deploy": () =>
        BB.bind(this)
          .then(this.checkAccountType)
          .then(async isMultiScript => {
            this.serverless.cli.log('Starting Serverless Cloudflare-Worker deployment.');
            if (isMultiScript && await duplicate.checkIfDuplicateRoutes(this.serverless, this.provider)) {
              return BB.reject("Duplicate routes pointing to different script");
            }

            if (this.getInvalidScriptNames()) {
              return BB.reject(
                "Worker names can contain lowercase letters, numbers, underscores, and dashes. They cannot start with dashes."
              );
            }

            if (isMultiScript) {
              return this.multiScriptDeployAll()
            } else {
              const functionObject = this.getFunctionObjectForSingleScript();
              return this.deploySingleScript(functionObject);
            }
          })
          .then(this.logDeployResponse)
          .then(k => this.serverless.cli.log(`Finished deployment in ${(Date.now() - startTime) / 1000} seconds.`))
          .then(k => this.serverless.cli.log('Finished Serverless Cloudflare-Worker deployment.'))
    };
  }
}

module.exports = CloudflareDeploy;

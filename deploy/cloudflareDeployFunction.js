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

const validateFunctionName = require("../shared/validate");
const accountType = require("../shared/accountType");
const utils = require("../utils");
const logs = require("./lib/logResponse");

class CloudflareDeployFunction {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};
    this.provider = this.serverless.getProvider("cloudflare");

    Object.assign(this, validateFunctionName, accountType, ms, utils, ss, logs);

    this.hooks = {
      "deploy:function:deploy": () =>
        BB.bind(this)
          .then(this.validateFunctionName)
          .then(this.checkAccountType)
          .then(async isMultiScript => {
            const isDuplicateRoutesPresent = await this.checkIfDuplicateRoutes(
              isMultiScript
            );
            if (isDuplicateRoutesPresent) {
              return BB.reject("Duplicate routes pointing to different script");
            }
            const functionObject = this.getFunctionObject();
            const { worker } = functionObject;
            if (!this.isValidScriptName(worker)) {
              return BB.reject(
                "Worker names can contain lowercase letters, numbers, underscores, and dashes. They cannot start with dashes."
              );
            }
            if (isMultiScript) {
              return this.multiScriptDeploy(functionObject);
            } else {
              return this.deploySingleScript(functionObject);
            }
          })
          .then(this.logDeployFunctionResponse)
    };
  }
}

module.exports = CloudflareDeployFunction;

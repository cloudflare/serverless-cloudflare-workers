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
const credentials = require("../provider/credentials");
const cf = require("cloudflare-workers-toolkit");

module.exports = {
  async checkAccountType() {
    const accountId = this.provider.config.accountId;
    const zoneId = this.provider.config.zoneId;
    return await BB.bind(this)
      .then(this.checkAllEnvironmentVariables)
      .then(function() {
        return cf.workers.getSettings({zoneId, accountId});
      })
      .then(this.checkIfMultiScript)
  },

  checkAllEnvironmentVariables() {
    const envCreds = credentials.get();
    const requiredCredentials = credentials.REQUIRED_CREDENTIALS;
    requiredCredentials.forEach(requiredCredential => {
      if (!envCreds[requiredCredential]) {
        return BB.reject(
          `Missing mandatory environment variable: CLOUDFLARE_${requiredCredential.toUpperCase()}.`
        );
      }
    });
  },
  checkIfMultiScript({ success, errors, result }) {
    if (!success) {
      return BB.reject(JSON.stringify(errors));
    }
    const { multiscript, enabled } = result;
    if (!enabled) {
      return BB.reject(
        "Workers are not enabled for this account, please upgrade your account at https://cloudflare.com"
      );
    }

    return multiscript;
  }
};

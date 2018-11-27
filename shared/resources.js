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
const sdk = require("../provider/sdk");

function isDuplicateNamespaceError(result) {
  return (result && result.success == false && result.errors.length == 1 && result.errors[0].code == 10014);
}

module.exports = {
  async createNamespace(accountId, name) {
    if (!accountId) {
      throw("You must provide an account ID");
    }

    let result = await sdk.cfApiCall({
      url: `/accounts/${accountId}/storage/kv/namespaces`,
      method: `POST`,
      contentType: `application/json`,
      body: JSON.stringify({
        title: name
      })
    });

    if (isDuplicateNamespaceError(result)) {
      result.success = true;
    }

    return result;
  },

  async deploy(serverless, config) {
    const resources = serverless.service.resources;

    if (resources.storage) {
      for (let space in storage) {
        await this.createNamespace(config.accountId, space.namespace);
      }
    } else {
      return;
    }
  }
}
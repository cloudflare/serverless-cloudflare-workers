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
const cf = require("cloudflare-workers-toolkit");

module.exports = {
  /**
   * @param {*} serverless
   * @param {*} provider
   */
  async checkIfDuplicateRoutes(serverless, provider) {
    // for any worker that we are uploading, we check its routes in the yml file and
    // check if there are exact same routes in our cloudflare account which point to
    // different script name
    if (typeof(provider) == 'undefined' || !provider.config) {
      throw("No config found.")
    }

    const { zoneId } = provider.config;

    if (!zoneId) {
      throw("You must specify a Zone ID CLOUDFLARE_ZONE_ID");
    }
    const response = await cf.routes.getRoutes({zoneId});
    const { result } = response;
      
    // check for all the workers we are uploading
    const foundDuplicate = result.some(filters => {
      const { pattern, script } = filters;

      const functions = serverless.service.getAllFunctions();
      for (const scriptName of functions) {
        const functionObject = serverless.service.getFunction(scriptName);
        const routes = functionObject.events.map(function(event) {
          if (event.http) {
            return event.http.url;
          }
        })
        
        //let uploadedName = functionObject.name || scriptName;
        return routes.some(r => {
          return r === pattern && functionObject.name !== script;
        });
      }
    });

    return foundDuplicate;
  }
}
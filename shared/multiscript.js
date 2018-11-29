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
const { generateCode } = require("../deploy/lib/workerScript");

module.exports = {
  getRoutes(events) {
    return events.map(function(event) {
      if (event.http) {
        return event.http.url;
      }
    });
  },

  /**
   * Parses the resources config to build bindings for the worker. Has to get namespaces for the CF id
   * @param {*} resources 
   */
  async getBindings(resources) {
    if (resources && resources.storage) { // do nothing if there is no storage config
      const namespaces = await cf.storage.getNamespaces();

      return resources.storage.map(function(store) {
        return {
          name: store.variable,
          type: 'kv_namespace',
          namespace_id: namespaces.find(function(ns) {
            return ns.title === store.namespace;
          }).id
        }
      })
    }

    return [];
  },

  /**
   * Deploys the Worker Script in functionObject from the yml file
   * @param {*} accountId 
   * @param {*} functionObject 
   */
  async deployWorker(accountId, functionObject) {
    cf.setAccountId(accountId);

    const contents = generateCode(functionObject);
    let bindings = await this.getBindings(functionObject.resources);

    return await cf.workers.deploy({
      accountId,
      name: functionObject.name,
      script: contents,
      bindings
    })
  },

  /**
   * Deploys the namespaces in function Object listed under resources->storage
   * @param {*} accountId 
   * @param {*} functionObject 
   */
  async deployNamespaces(accountId, functionObject) {
    let responses = [];
    
    if (functionObject.resources && functionObject.resources.storage) {
      for (const store of functionObject.resources.storage) {
        let result = await cf.storage.createNamespace({
          accountId,
          name: store.namespace
        });
        if (cf.storage.isDuplicateNamespaceError(result)) {
          result.success = true;
        }
        responses.push(result);
      }
    }
    
    return responses;
  },

  /**
   * Deploys all routes found in functionObject.events
   * @param {*} zoneId 
   * @param {*} functionObject 
   */
  async deployRoutes(zoneId, functionObject) {
    const allRoutes = this.getRoutes(functionObject.events);
    let routeResponses = [];
    for (const pattern of allRoutes) {
      const response = await cf.routes.deploy({path: pattern, scriptName: functionObject.name, zoneId});
      routeResponses.push(response)
    }

    return routeResponses;
  }
}
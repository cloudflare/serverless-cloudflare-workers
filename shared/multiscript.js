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
const path = require("path");
const { generateCode, generateWASM } = require("../deploy/lib/workerScript");

module.exports = {
  getRoutes(events) {
    return events.map(function (event) {
      if (event.http) {
        return event.http.url;
      }
    });
  },

  /**
   * Parses the resources and environment config to build bindings for the worker. async because it has to get namespaces for the CF id
   * @param {*} provider
   * @param {*} functionObject 
   */
  async getBindings(provider, functionObject) {

    let bindings = [];

    let resources = functionObject.resources;

    if (resources && resources.kv) { // do nothing if there is no kv config
      const namespaces = await cf.storage.getNamespaces();

      let namespaceBindings = resources.kv.map(function (store) {
        return {
          name: store.variable,
          type: 'kv_namespace',
          namespace_id: namespaces.find(function (ns) {
            return ns.title === store.namespace;
          }).id
        }
      });

      bindings = bindings.concat(namespaceBindings);
    }

    if (resources && resources.wasm) {
      let wasmBindings = resources.wasm.map(function(wasm) {
        return {
          name: wasm.variable,
          type: 'wasm_module',
          part: path.basename(wasm.file, path.extname(wasm.file))
        }
      });

      bindings = bindings.concat(wasmBindings);
    }

    // Get Environment Variables
    let envVars = Object.assign({}, provider.environment);
    envVars = Object.assign(envVars, functionObject.environment);

    for (const key in envVars) {
      bindings.push({
        name: key,
        type: 'secret_text',
        text: envVars[key]
      });
    }

    return bindings;
  },

  /**
   * Deploys the Worker Script in functionObject from the yml file
   * @param {*} accountId
   * @param {*} service
   * @param {*} functionObject 
   */
  async deployWorker(accountId, serverless, functionObject) {
    const { service } = serverless;
    cf.setAccountId(accountId);

    const contents = generateCode(serverless, functionObject);
    let bindings = await this.getBindings(service.provider, functionObject);

    let t = await cf.workers.deploy({
      accountId,
      name: functionObject.name,
      script: contents,
      wasm: generateWASM(functionObject),
      bindings
    })

    return t;
  },

  /**
   * Deploys the namespaces in function Object listed under resources->storage
   * @param {*} accountId 
   * @param {*} functionObject 
   */
  async deployNamespaces(accountId, functionObject) {
    let responses = [];

    if (functionObject.resources && functionObject.resources.kv) {
      for (const store of functionObject.resources.kv) {
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
      const response = await cf.routes.deploy({ path: pattern, scriptName: functionObject.name, zoneId });
      routeResponses.push(response)
    }

    return routeResponses;
  }
}
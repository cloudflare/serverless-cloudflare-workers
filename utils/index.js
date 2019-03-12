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
module.exports = {
  getFunctionObject(paramName) {
    let funParam = paramName || this.options.function;
    if (typeof funParam === "undefined") {
      funParam = this.options.f;
    }
    if (funParam) {
      return this.serverless.service.getFunction(funParam);
    } else return null;
  },
  getFunctionObjectForSingleScript() {
    const [functionName] = this.serverless.service.getAllFunctions();
    return this.getFunctionObject(functionName);
  },
  parseWorkerResponse(serverlessConsole, apiResponse) {
    let {
      success: workerDeploySuccess,
      result: workerResult,
      errors: workerErrors
    } = apiResponse;

    const { id, size } = workerResult || {};

    if (workerDeploySuccess) {
      serverlessConsole.log(
        `✅  Script Deployed. Name: ${id}, Size: ${(size / 1024).toFixed(2)}K`
      );
    } else {
      serverlessConsole.log(`❌ Fatal Error, Script Not Deployed!`);
      workerErrors.forEach(err => {
        let { code, message } = err;
        serverlessConsole.log(
          `--> Error Code:${code}\n--> Error Message: "${message}"`
        );
      });
    }
    return { workerDeploySuccess, workerResult, workerErrors };
  },
  aggregateWorkerResponse(serverlessConsole, apiResponse) {
    let status = [];
    apiResponse.forEach(resp => {
      status.push(this.parseWorkerResponse(serverlessConsole, resp));
    });
    return status;
  },

  parseRoutesResponse(serverlessConsole, apiResponse) {
    let status = [];
    apiResponse.forEach(resp => {
      let {
        success: routeSuccess,
        result: routeResult,
        errors: routeErrors
      } = resp;

      if (routeSuccess || !this.routeContainsFatalErrors(routeErrors)) {
        serverlessConsole.log(`✅  Routes Deployed `);
      } else {
        serverlessConsole.log(`❌  Fatal Error, Routes Not Deployed!`);
        routeErrors.forEach(err => {
          let { code, message } = err;
          serverlessConsole.log(
            `--> Error Code:${code}\n--> Error Message: "${message}"`
          );
        });
      }

      status.push({ routeSuccess, routeResult, routeErrors });
    });
    return status;
  },

  aggregateRoutesResponse(serverlessConsole, apiResponse) {
    let status = [];

    apiResponse.forEach(resp => {
      status.push(this.parseRoutesResponse(serverlessConsole, resp));
    });

    return status;
  },

  routeContainsFatalErrors(errors) {
    // suppress 10020 duplicate routes error
    // no need to show error when they are simply updating their script
    return errors.some(e => e.code !== 10020);
  }
};

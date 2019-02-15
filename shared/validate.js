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

module.exports = {
  validateFunctionName() {
    return BB.bind(this)
      .then(this.checkIfFuntionParamPresent)
      .then(this.checkFunctionName);
  },
  checkIfFuntionParamPresent() {
    let funParam = this.options.function;

    if (funParam === undefined) {
      funParam = this.options.f;
    }

    if (funParam === undefined || funParam === null || funParam === "") {
      return BB.reject("Invoke function with -f or --function");
    }
    return funParam;
  },

  /**
   * Ensures that funParam is an array of functions and ensures there are config entries for each.
   */
  checkFunctionName(funParam) {
    const functions = this.serverless.service.getAllFunctions();
    if (!Array.isArray(funParam)) {
      funParam = Array(funParam)
    }
    for (let func of funParam) {
      if (functions.indexOf(func) === -1) {
        return BB.reject(`The specified function: ${func} was not found in your configuration file.`);
      }
    }

    return funParam;
  },

  isValidScriptName(sname) {
    const re = new RegExp("^[a-z0-9_][A-Za-z0-9-_]*$");
    if (re.exec(sname)) {
      return true;
    }
    return false;
  },
  
  getInvalidScriptNames() {
    const functions = this.serverless.service.getAllFunctions();
    const notValidScriptNames = functions.find(scriptName => {
      return !this.isValidScriptName(scriptName);
    });
    return notValidScriptNames;
  }
};

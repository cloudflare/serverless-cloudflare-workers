const proxyquire =  require('proxyquire')
const assert = require('assert');

const resources = proxyquire("../../shared/resources", {
  '../provider/sdk': {
    'cfApiCall': function(options) {
      if (options.url.match(/storage\/kv\/namespace/)) {
        return Promise.resolve({"success": true})
      } else if(options.url.match('duplicate')) {
        return Promise.resolve({"success": false, "errors": [{
          "code": 10014,
          "message": "a namespace with this account ID and title already exists"
        }]})
      
      } else {
        return Promise.resolve({"success": false})
      }
    }
  }
});

describe("createNamespace", function() {
  it("calls the correct url", async function() {
    const result = await resources.createNamespace(1, "myNamespace");
    assert.equal(result.success, true)
  });

  it("errors without an account Id", async function() {
    try {
      const result = await resources.createNamespace(null, "namespace");
      assert(false);
    } catch(err) {
      assert.equal(err, "You must provide an account ID")
    }
  });

  it("disregards an existing namespace", async function() {
    try {
      const result = await resources.createNamespace(1, "duplicate");
      assert.equal(result.success, true)
    } catch (err) {
      assert(false);
    }
  });
});
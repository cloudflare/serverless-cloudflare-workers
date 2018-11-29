const proxyquire =  require('proxyquire')
const assert = require('assert');

const validate = proxyquire("../../shared/duplicate", {
  'cloudflare-workers-toolkit': {
    "routes": {
      'getRoutes': function() {
        return Promise.resolve({
          "result": [{
            pattern: "route1",
            script: "existing"
          }]
        })
      }
    }
  }
});

describe("checkIfDuplicateRoutes", function() {
  it("should fail gracefully if no config is provided", async function() {
    try {
      await validate.checkIfDuplicateRoutes();
    } catch (e) {
      assert.equal(e, "No config found.");
    }
  });

  const PROVIDER = {
    config: {
      accountId: 12,
      zoneId: 13
    }
  }

  const FUNCTIONS = ["first", "second"];
  const SERVERLESS = {
    service: {
      getAllFunctions: function() {
        return FUNCTIONS;
      },
      getFunction: function(name) {
        return {
          webpack: false,
          name: name,
          script: `test/handlers/${name}`,
          events: [ { http: {url: "route1", method: 'GET'}} ]
        }
      }
    }
  }
  
  it("should detect duplicates in the same yml file", async function() {
    const result = await validate.checkIfDuplicateRoutes(SERVERLESS, PROVIDER);
    assert.equal(result, true)
  });
});
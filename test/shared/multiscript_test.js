const proxyquire =  require('proxyquire')
const assert = require('assert');

const ms = proxyquire("../../shared/multiscript", {
  '../provider/sdk': {
    'cfApiCall': function() {return Promise.resolve({"routes": []})}
  }
});

const EVENTS = [{
  'http': {
    url: 'somedomain.com/route1',
    method: 'GET'
  }
}, {
  'http': {
    url: 'somedomain.com/route2',
    method: 'GET'
  }
}];

const ZONE_ID = "123456";
const GOOD_RESPONSE = {
  routes: []
}

describe("getRoutes", function() {
  it("pulls routes out of the event config", function() {
    const routes = ms.getRoutes(EVENTS);
    assert.deepEqual(routes, ['somedomain.com/route1', 'somedomain.com/route2'])
  });
});

describe("getRoutesMultiScript", function() {
  it("fetches routes from the API", async function() {
    const response = await ms.getRoutesMultiScript(ZONE_ID);
    assert.deepEqual(response, GOOD_RESPONSE);
  })
});
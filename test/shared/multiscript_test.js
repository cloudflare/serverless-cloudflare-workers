const proxyquire =  require('proxyquire')
const assert = require('assert');

const ms = proxyquire("../../shared/multiscript", {
  "cloudflare-workers-toolkit": {
    
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

describe("getRoutes", function() {
  it("pulls routes out of the event config", function() {
    const routes = ms.getRoutes(EVENTS);
    assert.deepEqual(routes, ['somedomain.com/route1', 'somedomain.com/route2'])
  });
});
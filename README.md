# serverless-cloudflare-workers
Serverless plugin for Cloudflare Workers 

## Documentation

https://serverless.com/framework/docs/providers/cloudflare/guide/quick-start/

### Bundling with Webpack

You can have the plugin automatically bundle your code into one file using webpack. This is a great solution if you are fine with a no frills bundling.

Simply add webpack: true to your config block.

```
service:
  name: my-service
  config:
    webpack: true
    workers:
      workerOne:
      ...
```
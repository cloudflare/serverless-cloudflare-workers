# serverless-cloudflare-workers

Serverless plugin for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Documentation

See full documentation for using the plugin at: [Serverless for Cloudflare](https://serverless.com/framework/docs/providers/cloudflare/guide/quick-start/)


<!--Simply commenting this section out since information is not currently in serverless
 ### Using Cloudflare KV Storage

The plugin can create and bind a [KV Storage](https://developers.cloudflare.com/workers/kv/) namespace for your function by simpling adding a resources section.

The following will create a namespace called `BEST_NAMESPACE` and bind the variable `TEST` to that namespace inside `myfunction`.

```yaml
functions:
  myfunction:
    name: myfunction
    webpack: true
    script: handlers/myfunctionhandler
    resources:
      kv:
        - variable: TEST
          namespace: BEST_NAMESPACE
    events:
      - http:
          url: example.com/myfunction
          method: GET
```

### Web Assembly

The plugin can upload and bind WASM to execute in your worker. The easiest way to do this is to use the --template cloudflare-workers-rust when generating a project. The template includes a Rust create folder setup with wasm-pack, a webpack script for adding the generated javascript into your project, and the yml file settings to upload the wasm file itself.

```yaml
functions:
  myfunction:
    name: myfunction
    webpack: true
    script: handlers/myfunctionhandler
    resources:
      wasm:
        - variable: WASM
          filename: rust/pkg/wasm_bg.wasm
    events:
      - http:
          url: example.com/myfunction
          method: GET
``` -->

## Develop on Plugin

Add documentation on how to develop on the plugin here please :) 
Issue tracked at https://github.com/cloudflare/serverless-cloudflare-workers/issues/37 
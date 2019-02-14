# serverless-cloudflare-workers

Serverless plugin for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Documentation

https://serverless.com/framework/docs/providers/cloudflare/guide/quick-start/

### Bundling with Webpack

You can have the plugin automatically bundle your code into one file using [webpack](https://webpack.js.org/). This is a great solution if you are fine with a no frills bundling.

Simply add `webpack: true` to your config block.

```yaml
functions:
  myfunction:
    name: myfunction
    webpack: true
    script: handlers/myfunctionhandler
    events:
      - http:
          url: example.com/myfunction
          method: GET
```

To customize webpack config, you can pass config as value.

```yaml
functions:
  myfunction:
    name: myfunction
    webpack:
      node:
        fs: empty
        tls: empty
    script: handlers/myfunctionhandler
    events:
      - http:
          url: example.com/myfunction
          method: GET
```


### Environment Variables

While Cloudflare Workers doesn't exactly offer environment vairables, we can bind global variables to values, essentially giving the same capabilities. In your function configuration, add key value pairs in `environment`

```yaml
functions:
  myFunction:
    environment:
      MYKEY: value_of_my_key
      ANOTHER_KEY_OF_MINE: sweet_child_o_mine

```

Then in your script, you can reference `MYKEY` to access the value.

You can also add an environment block under `provider`. These will get added to every function. If a function defines the same variable, the function defintion will overwrite the provider block definition.

```yaml
provider:
  name: cloudflare
  environment:
    MYKEY: value_of_my_key
    ANOTHER_KEY_OF_MINE: sweet_child_o_mine

```

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

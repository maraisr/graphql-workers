# graphql-workers

<div align="right">
<p><code>npm add graphql-workers</code> puts graphql on the edge</p>
<span>
<a href="https://github.com/maraisr/graphql-workers/actions/workflows/ci.yml">
	<img src="https://github.com/maraisr/graphql-workers/actions/workflows/ci.yml/badge.svg"/>
</a>
<a href="https://npm-stat.com/charts.html?package=graphql-workers">
	<img src="https://badgen.net/npm/dw/graphql-workers?labelColor=black&color=black&cache=600" alt="downloads"/>
</a>
<a href="https://bundlephobia.com/result?p=graphql-workers">
	<img src="https://badgen.net/bundlephobia/minzip/graphql-workers?labelColor=black&color=black" alt="size"/>
</a>
</span>

<br />
<br />
</div>

## ⚡ Features

- 🤔 **Familiar** — thin layer ontop of graphql-js

- 🪢 **defer/stream** — incremental delivery out of the box

## 🚀 Usage

```sh
npm add graphql-workers \
  graphql@16.1.0-experimental-stream-defer.6
```

> at this stage you need a custom tag to support defer/stream, but this is optional

```ts
import { makeHandler, createSchemaResponder } from 'graphql-workers';

// your schem as however you have it defined
declare const schema: GraphQLSchema;

export default {
	async fetch(req, env, ctx) {
		// ~> create a streamable schema
		const { reply } = createSchemaResponder(ctx, schema);

		// ~> get the paramaters in way you wish
		// maybe its a KV read for Relay persisted queries
		const { query, variables, operationName } = await req.json();

		// ~> then simply reply
		return reply(query, variables, operationName);
	}
}

// or a module workers convience method
export default makeHandler(schema);
```

## License

MIT © [Marais Rossouw](https://marais.io)

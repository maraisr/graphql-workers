import flru from "flru";
import {
	type DocumentNode,
	type GraphQLSchema,
	type ValidationRule,
	execute,
	parse,
	validate,
} from "graphql";
import { stream } from "piecemeal/worker";
import { send } from "worktop/response";

export interface Options {
	context?: unknown;
	validationRules?: ValidationRule[];
	cacheQueryParse?: boolean;
	executor?: typeof execute;
}

let queryCache = flru<DocumentNode>(10);

export const createSchemaResponder = (ctx: ExecutionContext, schema: GraphQLSchema, options?: Options) => {
	options = options || {};

	let cache = (options.cacheQueryParse ?? true) ? queryCache : null;

	async function reply(query: DocumentNode | string, variables?: Record<string, any>, operationName?: string) {
		let query_ast: DocumentNode,
			query_string = typeof query === "string";

		if (query_string) {
			if (cache && cache.has(query as string)) {
				query_ast = cache.get(query as string);
			} else {
				query_ast = parse(query as string);
			}
		} else {
			query_ast = query as DocumentNode;
		}

		const validation_errors = validate(schema, query_ast, options.validationRules, {
			maxErrors: 1,
		});
		if (validation_errors.length) return send(406, { errors: validation_errors });
		if (query_string && cache) cache.set(query as string, query_ast);

		const result = await (options.executor || execute)({
			operationName,
			schema,
			document: query_ast,
			contextValue: options.context,
			variableValues: variables,
		});

		if (isAsyncGenerator(result)) {
			const { response, pipe } = stream(result);
			ctx.waitUntil(pipe());
			return response;
		}

		return send(200, result, {
			"content-type": "application/graphql+json",
		});
	}

	return { reply };
};

export const makeHandler = (schema: GraphQLSchema, options?: Options): ExportedHandler => ({
	fetch: async (req, _env, ctx) => {
		try {
			var body: { query: string, operationName?: string, variables?: Record<string, any> } = await req.json();
		} catch (e) {
			return send(406, { errors: [{ message: "malformed body" }] });
		}

		const query = body.query;
		if (!query) return send(406, { errors: [{ message: "query param required" }] });

		const { reply } = createSchemaResponder(ctx, schema, options);

		return reply(query, body.variables, body.operationName);
	},
});

const isAsyncGenerator = (input: unknown): input is AsyncGenerator =>
	typeof input === "object" &&
	input !== null &&
	((input as any)[Symbol.toStringTag] === "AsyncGenerator" ||
		(Symbol.asyncIterator && Symbol.asyncIterator in input));

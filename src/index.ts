import flru from "flru";
import {
	type DocumentNode,
	execute,
	type GraphQLSchema,
	parse,
	validate,
	type ValidationRule,
} from "graphql";
import { stream } from "piecemeal/worker";
import { reply } from "worktop/response";

export interface Options {
	context?: unknown;
	validationRules?: ValidationRule[];
	queryParseCache?: Map<string, DocumentNode> | false;
	executor?: typeof execute;
}

let queryCache = flru<DocumentNode>(10);

export const createSchemaResponder = (ctx: ExecutionContext, schema: GraphQLSchema, options?: Options) => {
	options = options || {};

	let cache = (options.queryParseCache ?? queryCache);

	async function replyFn(query: DocumentNode | string, variables?: Record<string, any> | null, operationName?: string) {
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
		if (validation_errors.length) return reply(406, { errors: validation_errors });
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

		return reply(200, result, {
			"content-type": "application/graphql+json",
		});
	}

	return { reply: replyFn };
};

export const makeHandler = (schema: GraphQLSchema, options?: Options): ExportedHandler => ({
	fetch: async (req, _env, ctx) => {
		try {
			var body: {
				query: string,
				operationName?: string,
				variables?: Record<string, any> | null
			} = await req.json();
		} catch (e) {
			return reply(406, { errors: [{ message: "malformed body" }] });
		}

		const query = body.query;
		if (!query) return reply(406, { errors: [{ message: "query param required" }] });

		return createSchemaResponder(ctx, schema, options)
			.reply(query, body.variables, body.operationName);
	},
});

/*#__INLINE__*/
const isAsyncGenerator = (input: unknown): input is AsyncGenerator =>
	// @ts-ignore
	input[Symbol.asyncIterator] < "u";

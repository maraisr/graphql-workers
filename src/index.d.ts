import type {
    DocumentNode,
    ValidationRule,
    execute,
} from "graphql";

export type Options = {
    context?: unknown;
    validationRules?: ValidationRule[];
    queryParseCache?: Map<string, DocumentNode> | false;
    executor?: typeof execute;
}

/**
 * @internal
 */
export type SchemaResponder = {
    reply: (query: DocumentNode | string, variables?: Record<string, any> | null, operationName?: string) => Promise<Response>;
}

export const createSchemaResponder = (ctx: ExecutionContext, schema: GraphQLSchema, options?: Options) => SchemaResponder;

export const makeHandler = (schema: GraphQLSchema, options?: Options) => ExportedHandler;
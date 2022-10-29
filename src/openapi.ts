import { zodToJsonSchema } from "zod-to-json-schema";
import type { OpenAPIV3 } from "openapi-types";
import type {
  ZodiosEndpointDefinition,
  ZodiosEndpointDefinitions,
} from "@zodios/core";
import { z } from "zod";
import { isZodType } from "./utils";

const pathRegExp = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
const expludedParamTypes = ["Body", "Path"];

function pathWithoutParams(path: string) {
  return path.indexOf("?") > -1
    ? path.split("?")[0]
    : path.indexOf("#") > -1
    ? path.split("#")[0]
    : path;
}

function tagsFromPath(path: string): string[] | undefined {
  const resources = pathWithoutParams(path)
    .replace(pathRegExp, "")
    .split("/")
    .filter((part) => part !== "");
  return resources ? [resources[resources.length - 1]] : undefined;
}

export function bearerAuthScheme(
  description?: string
): OpenAPIV3.SecuritySchemeObject {
  return {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description,
  };
}

export function basicAuthScheme(
  description?: string
): OpenAPIV3.SecuritySchemeObject {
  return {
    type: "http",
    scheme: "basic",
    description,
  };
}

export function apiKeyAuthScheme(
  options: Omit<OpenAPIV3.ApiKeySecurityScheme, "type" | "description">,
  description?: string
): OpenAPIV3.SecuritySchemeObject {
  return {
    type: "apiKey",
    description,
    ...options,
  };
}

export function oauth2Scheme(
  flows: OpenAPIV3.OAuth2SecurityScheme["flows"],
  description?: string
): OpenAPIV3.SecuritySchemeObject {
  return {
    type: "oauth2",
    description,
    flows,
  };
}

function findPathParam(endpoint: ZodiosEndpointDefinition, paramName: string) {
  return endpoint.parameters?.find(
    (param) => param.type === "Path" && param.name === paramName
  );
}

/**
 * Create an openapi V3 document from a list of api definitions
 * Use this function if you want to define multiple apis protected by different security schemes
 * @param options  - the parameters to create the document
 * @returns - the openapi V3 document
 */
function makeOpenApi(options: {
  apis: Array<
    | {
        definitions: ZodiosEndpointDefinitions;
      }
    | {
        scheme: string;
        securityRequirement?: string[];
        definitions: ZodiosEndpointDefinitions;
      }
  >;
  info?: OpenAPIV3.InfoObject;
  servers?: OpenAPIV3.ServerObject[];
  securitySchemes?: Record<string, OpenAPIV3.SecuritySchemeObject>;
  tagsFromPathFn?: (path: string) => string[];
}) {
  const { tagsFromPathFn = tagsFromPath } = options;
  const openApi: OpenAPIV3.Document = {
    openapi: "3.0.0",
    info: options.info ?? {
      title: "Zodios : add an info object to 'toOpenApi' options",
      version: "1.0.0",
    },
    servers: options.servers,
    paths: {},
  };
  if (options.securitySchemes) {
    openApi.components = {
      securitySchemes: options.securitySchemes,
    };
  }
  for (let api of options.apis) {
    for (let endpoint of api.definitions) {
      const responses: OpenAPIV3.ResponsesObject = {
        [`${endpoint.status ?? 200}`]: {
          description: "Success",
          content: {
            "application/json": {
              schema: zodToJsonSchema(endpoint.response, {
                target: "openApi3",
              }) as OpenAPIV3.SchemaObject,
            },
          },
        },
      };
      for (let error of endpoint.errors ?? []) {
        responses[`${error.status}`] = {
          description: error.description ?? "Error",
          content: {
            "application/json": {
              schema: zodToJsonSchema(error.schema, {
                target: "openApi3",
              }) as OpenAPIV3.SchemaObject,
            },
          },
        };
      }
      const parameters: OpenAPIV3.ParameterObject[] = [];
      // extract path parameters from endpoint path
      const pathParams = endpoint.path.match(pathRegExp);
      if (pathParams) {
        for (let pathParam of pathParams) {
          const paramName = pathParam.slice(1);
          const param = findPathParam(endpoint, paramName);
          if (param) {
            parameters.push({
              name: paramName,
              description: param.description,
              in: "path",
              schema: zodToJsonSchema(param.schema, {
                target: "openApi3",
              }) as OpenAPIV3.SchemaObject,
              required: true,
            });
          } else {
            parameters.push({
              name: paramName,
              in: "path",
              schema: {
                type: "string",
              },
              required: true,
            });
          }
        }
      }
      // extract all other parameters from endpoint
      for (let param of endpoint.parameters ?? []) {
        if (!expludedParamTypes.includes(param.type)) {
          const required = !param.schema.isOptional();
          const schema =
            required ||
            !isZodType(param.schema, z.ZodFirstPartyTypeKind.ZodOptional)
              ? param.schema
              : (param.schema as z.ZodOptional<z.ZodType>).unwrap();
          parameters.push({
            name:
              param.type === "Query" &&
              isZodType(param.schema, z.ZodFirstPartyTypeKind.ZodArray)
                ? `${param.name}[]`
                : param.name,
            in: param.type.toLowerCase(),
            schema: zodToJsonSchema(schema, {
              target: "openApi3",
            }) as OpenAPIV3.SchemaObject,
            description: param.description,
            required,
          } as OpenAPIV3.ParameterObject);
        }
      }
      const path = endpoint.path.replace(pathRegExp, "{$1}");
      const body = endpoint.parameters?.find((param) => param.type === "Body");

      const operation: OpenAPIV3.OperationObject = {
        operationId: endpoint.alias,
        summary: endpoint.description,
        description: endpoint.description,
        tags: tagsFromPathFn(endpoint.path),
        security:
          "scheme" in api && api.scheme
            ? [{ [api.scheme]: api.securityRequirement ?? ([] as string[]) }]
            : undefined,
        requestBody: body
          ? {
              description: body.description,
              content: {
                "application/json": {
                  schema: zodToJsonSchema(body.schema, {
                    target: "openApi3",
                  }) as OpenAPIV3.SchemaObject,
                },
              },
            }
          : undefined,
        parameters,
        responses,
      };
      openApi.paths[path] = {
        ...openApi.paths[path],
        [endpoint.method]: operation,
      };
    }
  }
  return openApi;
}

/**
 * Create a simple openapi V3 document from a list of endpoints
 * @param definitions - the list of endpoints
 * @param options - additional information to add to the document
 * @returns - the openapi V3 document
 * @deprecated - use openApiBuilder instead
 */
export function toOpenApi(
  definitions: ZodiosEndpointDefinitions,
  options?: {
    info?: OpenAPIV3.InfoObject;
    servers?: OpenAPIV3.ServerObject[];
    securityScheme?: OpenAPIV3.SecuritySchemeObject;
    tagsFromPathFn?: (path: string) => string[];
  }
): OpenAPIV3.Document {
  return makeOpenApi({
    apis: [
      {
        scheme: "auth",
        definitions,
      },
    ],
    securitySchemes: options?.securityScheme
      ? { auth: options.securityScheme }
      : undefined,
    ...options,
  });
}

/**
 * Builder to easily create an openapi V3 document from zodios api definitions
 * @param info - the info object to add to the document
 * @returns - the openapi V3 builder
 */
export function openApiBuilder(info: OpenAPIV3.InfoObject) {
  const apis: Array<
    | {
        definitions: ZodiosEndpointDefinitions;
      }
    | {
        scheme: string;
        securityRequirement?: string[];
        definitions: ZodiosEndpointDefinitions;
      }
  > = [];
  const options: {
    info: OpenAPIV3.InfoObject;
    servers?: OpenAPIV3.ServerObject[];
    securitySchemes?: Record<string, OpenAPIV3.SecuritySchemeObject>;
    tagsFromPathFn?: (path: string) => string[];
  } = { info };
  return {
    /**
     * add a security scheme to proctect the apis
     * @param name - the name of the security scheme
     * @param securityScheme - the security scheme object
     */
    addSecurityScheme(
      name: string,
      securityScheme: OpenAPIV3.SecuritySchemeObject
    ) {
      options.securitySchemes = options.securitySchemes ?? {};
      options.securitySchemes[name] = securityScheme;
      return this;
    },
    /**
     * add an api with public endpoints
     * @param definitions - the endpoint definitions
     * @returns
     */
    addPublicApi(definitions: ZodiosEndpointDefinitions) {
      apis.push({ definitions });
      return this;
    },
    /**
     * add an api protected by a security scheme
     * @param scheme - the name of the security scheme to use
     * @param definitions - the endpoints API
     * @param securityRequirement - optional security requirement to use for this API (oauth2 scopes for example)
     */
    addProtectedApi(
      scheme: string,
      definitions: ZodiosEndpointDefinitions,
      securityRequirement?: string[]
    ) {
      apis.push({ scheme, definitions, securityRequirement });
      return this;
    },
    /**
     * add a server to the openapi document
     * @param server - the server to add
     */
    addServer(server: OpenAPIV3.ServerObject) {
      options.servers = options.servers ?? [];
      options.servers.push(server);
      return this;
    },
    /**
     * ovveride the default tagsFromPathFn
     * @param tagsFromPathFn - a function that takes a path and returns the tags to use for this path
     */
    setCustomTagsFn(tagsFromPathFn: (path: string) => string[]) {
      options.tagsFromPathFn = tagsFromPathFn;
      return this;
    },
    build() {
      return makeOpenApi({
        apis,
        ...options,
      });
    },
  };
}

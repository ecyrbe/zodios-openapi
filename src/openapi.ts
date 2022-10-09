import { zodToJsonSchema } from "zod-to-json-schema";
import type { OpenAPIV3 } from "openapi-types";
import type { ZodiosEnpointDescriptions } from "@zodios/core";
import { z } from "zod";

const pathRegExp = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

function pathWithoutParams(path: string) {
  return path.indexOf("?") > -1
    ? path.split("?")[0]
    : path.indexOf("#") > -1
    ? path.split("#")[0]
    : path;
}

function tagsFromPath(path: string): string[] | undefined {
  const lastResource = pathWithoutParams(path)
    .replace(pathRegExp, "")
    .split("/")
    .filter((part) => part !== "")
    .at(-1);
  return lastResource ? [lastResource] : undefined;
}

export function bearerAuthScheme(): OpenAPIV3.SecuritySchemeObject {
  return {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  };
}

export function basicAuthScheme(): OpenAPIV3.SecuritySchemeObject {
  return {
    type: "http",
    scheme: "basic",
  };
}

export function oauth2Scheme(
  flows: OpenAPIV3.OAuth2SecurityScheme["flows"]
): OpenAPIV3.SecuritySchemeObject {
  return {
    type: "oauth2",
    flows,
  };
}

export function toOpenApi(
  endpointDescriptions: ZodiosEnpointDescriptions,
  options?: {
    info?: OpenAPIV3.InfoObject;
    servers?: OpenAPIV3.ServerObject[];
    securityScheme?: OpenAPIV3.SecuritySchemeObject;
    tagsFromPathFn?: (path: string) => string[];
  }
): OpenAPIV3.Document {
  const { tagsFromPathFn = tagsFromPath } = options || {};
  const openApi: OpenAPIV3.Document = {
    openapi: "3.0.0",
    info: options?.info ?? {
      title: "Zodios : add an info object to 'toOpenApi' options",
      version: "1.0.0",
    },
    servers: options?.servers,
    security: options?.securityScheme ? [{ auth: [] }] : undefined,
    paths: {},
    components: options?.securityScheme
      ? {
          securitySchemes: {
            auth: options.securityScheme,
          },
        }
      : undefined,
  };
  for (let endpoint of endpointDescriptions) {
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
    // extract all other parameters from endpoint
    for (let param of endpoint.parameters ?? []) {
      if (param.type !== "Body") {
        const required = !param.schema.isOptional();
        const schema = required
          ? param.schema
          : (param.schema as z.ZodOptional<z.ZodType>).unwrap();
        parameters.push({
          name: param.name,
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
  return openApi;
}

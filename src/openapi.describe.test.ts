import { makeApi } from "@zodios/core";
import { z } from "zod";
import {
  toOpenApi,
  basicAuthScheme,
  bearerAuthScheme,
  oauth2Scheme,
  openApiBuilder,
} from "./openapi";

const user = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const api = makeApi([
  {
    method: "get",
    path: "/users?filter=:filter#fragment",
    alias: "getUsers",
    description: "Get all users",
    parameters: [
      {
        name: "limit",
        type: "Query",
        schema: z
          .number()
          .positive()
          .default(10)
          .describe("Limit the number of users"),
      },
      {
        name: "offset",
        type: "Query",

        schema: z
          .number()
          .positive()
          .optional()
          .describe("Offset the number of users"),
      },
      {
        name: "filter",
        type: "Query",

        schema: z
          .array(z.string())
          .refine((a) => new Set(a).size === a.length, "No duplicates allowed")
          .describe("Filter users by name"),
      },
    ],
    response: z.array(user),
    errors: [
      {
        status: 404,
        schema: z
          .object({
            message: z.literal("No users found"),
          })
          .describe("No users found"),
      },
      {
        status: "default",
        schema: z
          .object({
            message: z.string(),
          })
          .describe("Default error"),
      },
    ],
  },
  {
    method: "get",
    path: "/users/:id",
    alias: "getUser",
    description: "Get a user by id",
    response: user,
  },
  {
    method: "post",
    path: "/users",
    alias: "createUser",
    description: "Create a user",
    parameters: [
      {
        name: "user",
        type: "Body",
        schema: user.omit({ id: true }).describe("The user to create"),
      },
    ],
    response: user,
  },
  {
    method: "put",
    path: "/users/:id",
    alias: "updateUser",
    description: "Update a user",
    parameters: [
      {
        name: "user",
        type: "Body",

        schema: user.describe("The user to update"),
      },
    ],
    response: user,
  },
  {
    method: "delete",
    path: "/users/:id",
    alias: "deleteUser",

    response: z.void().describe("Delete a user"),
    status: 204,
  },
]);

describe("toOpenApi", () => {
  it("should generate bearer scheme", () => {
    const scheme = bearerAuthScheme();
    expect(scheme).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
  });

  it("should generate basic scheme", () => {
    const scheme = basicAuthScheme();
    expect(scheme).toEqual({
      type: "http",
      scheme: "basic",
    });
  });

  it("should generate oauth2 scheme", () => {
    const scheme = oauth2Scheme({
      implicit: {
        authorizationUrl: "https://example.com/oauth2/authorize",
        scopes: {
          read: "Read access",
          write: "Write access",
        },
      },
    });
    expect(scheme).toEqual({
      type: "oauth2",
      flows: {
        implicit: {
          authorizationUrl: "https://example.com/oauth2/authorize",
          scopes: {
            read: "Read access",
            write: "Write access",
          },
        },
      },
    });
  });

  it("should convert to openapi", () => {
    const openApi = toOpenApi(api, {
      info: {
        title: "My API",
        version: "1.0.0",
      },
    });
    expect(openApi).toMatchSnapshot();
  });

  it("should convert to openapi with prefix", () => {
    const openApi = toOpenApi(api, {
      info: {
        title: "My Prefixed API",
        version: "1.0.0",
      },
      servers: [
        {
          url: "/api/v1",
        },
      ],
    });
    expect(openApi).toMatchSnapshot();
  });

  it("should convert to openapi with bearer auth", () => {
    const openApi = toOpenApi(api, {
      info: {
        title: "My Bearer API",
        version: "1.0.0",
      },
      securityScheme: bearerAuthScheme(),
    });
    expect(openApi).toMatchSnapshot();
  });

  it("should convert to openapi with basic auth", () => {
    const openApi = toOpenApi(api, {
      info: {
        title: "My Basic API",
        version: "1.0.0",
      },
      securityScheme: basicAuthScheme(),
    });
    expect(openApi).toMatchSnapshot();
  });

  it("should convert to openapi with oauth2 auth", () => {
    const openApi = toOpenApi(api, {
      info: {
        title: "My OAuth2 API",
        version: "1.0.0",
      },
      securityScheme: oauth2Scheme({
        implicit: {
          authorizationUrl: "https://example.com/oauth2/authorize",
          scopes: {
            read: "Read access",
            write: "Write access",
          },
        },
      }),
    });
    expect(openApi).toMatchSnapshot();
  });

  it("should convert to openapi with builder", () => {
    const openApi = openApiBuilder({
      title: "My API",
      version: "1.0.0",
    })
      .addPublicApi(api)
      .build();
    expect(openApi).toMatchSnapshot();
  });

  it("should convert to openapi with builder with security", () => {
    const openApi = openApiBuilder({
      title: "My API",
      version: "1.0.0",
    })
      .addServer({ url: "/api/v1" })
      .addSecurityScheme("auth", bearerAuthScheme())
      .addProtectedApi("auth", api)
      .build();
    expect(openApi).toMatchSnapshot();
  });
});

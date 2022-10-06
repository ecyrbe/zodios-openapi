import { makeApi } from "@zodios/core";
import { z } from "zod";
import { toOpenApi } from "./openapi";

const user = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const api = makeApi([
  {
    method: "get",
    path: "/users",
    alias: "getUsers",
    description: "Get all users",
    parameters: [
      {
        name: "limit",
        type: "Query",
        description: "Limit the number of users",
        schema: z.number().positive(),
      },
      {
        name: "offset",
        type: "Query",
        description: "Offset the number of users",
        schema: z.number().positive().optional(),
      },
    ],
    response: z.array(user),
    errors: [
      {
        status: 404,
        description: "No users found",
        schema: z.object({
          message: z.literal("No users found"),
        }),
      },
      {
        status: "default",
        description: "Default error",
        schema: z.object({
          message: z.string(),
        }),
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
        description: "The user to create",
        schema: user.omit({ id: true }),
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
        description: "The user to update",
        schema: user,
      },
    ],
    response: user,
  },
  {
    method: "delete",
    path: "/users/:id",
    alias: "deleteUser",
    description: "Delete a user",
    response: z.void(),
    status: 204,
  },
]);

describe("toOpenApi", () => {
  it("should convert to openapi", () => {
    const openApi = toOpenApi(api, {
      info: {
        title: "My API",
        version: "1.0.0",
      },
    });
    expect(openApi).toEqual({
      info: {
        title: "My API",
        version: "1.0.0",
      },
      openapi: "3.0.0",
      paths: {
        "/users": {
          get: {
            description: "Get all users",
            operationId: "getUsers",
            parameters: [
              {
                description: "Limit the number of users",
                in: "query",
                name: "limit",
                required: true,
                schema: {
                  exclusiveMinimum: true,
                  minimum: 0,
                  type: "number",
                },
              },
              {
                description: "Offset the number of users",
                in: "query",
                name: "offset",
                required: false,
                schema: {
                  exclusiveMinimum: true,
                  minimum: 0,
                  type: "number",
                },
              },
            ],
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      items: {
                        additionalProperties: false,
                        properties: {
                          email: {
                            format: "email",
                            type: "string",
                          },
                          id: {
                            type: "string",
                          },
                          name: {
                            type: "string",
                          },
                        },
                        required: ["id", "name", "email"],
                        type: "object",
                      },
                      type: "array",
                    },
                  },
                },
                description: "Success",
              },
              "404": {
                content: {
                  "application/json": {
                    schema: {
                      additionalProperties: false,
                      properties: {
                        message: {
                          enum: ["No users found"],
                          type: "string",
                        },
                      },
                      required: ["message"],
                      type: "object",
                    },
                  },
                },
                description: "No users found",
              },
              default: {
                content: {
                  "application/json": {
                    schema: {
                      additionalProperties: false,
                      properties: {
                        message: {
                          type: "string",
                        },
                      },
                      required: ["message"],
                      type: "object",
                    },
                  },
                },
                description: "Default error",
              },
            },
            summary: "Get all users",
          },
          post: {
            description: "Create a user",
            operationId: "createUser",
            parameters: [],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    additionalProperties: false,
                    properties: {
                      email: {
                        format: "email",
                        type: "string",
                      },
                      name: {
                        type: "string",
                      },
                    },
                    required: ["name", "email"],
                    type: "object",
                  },
                },
              },
              description: "The user to create",
            },
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      additionalProperties: false,
                      properties: {
                        email: {
                          format: "email",
                          type: "string",
                        },
                        id: {
                          type: "string",
                        },
                        name: {
                          type: "string",
                        },
                      },
                      required: ["id", "name", "email"],
                      type: "object",
                    },
                  },
                },
                description: "Success",
              },
            },
            summary: "Create a user",
          },
        },
        "/users/{id}": {
          delete: {
            description: "Delete a user",
            operationId: "deleteUser",
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "204": {
                content: {
                  "application/json": {},
                },
                description: "Success",
              },
            },
            summary: "Delete a user",
          },
          get: {
            description: "Get a user by id",
            operationId: "getUser",
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      additionalProperties: false,
                      properties: {
                        email: {
                          format: "email",
                          type: "string",
                        },
                        id: {
                          type: "string",
                        },
                        name: {
                          type: "string",
                        },
                      },
                      required: ["id", "name", "email"],
                      type: "object",
                    },
                  },
                },
                description: "Success",
              },
            },
            summary: "Get a user by id",
          },
          put: {
            description: "Update a user",
            operationId: "updateUser",
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    additionalProperties: false,
                    properties: {
                      email: {
                        format: "email",
                        type: "string",
                      },
                      id: {
                        type: "string",
                      },
                      name: {
                        type: "string",
                      },
                    },
                    required: ["id", "name", "email"],
                    type: "object",
                  },
                },
              },
              description: "The user to update",
            },
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      additionalProperties: false,
                      properties: {
                        email: {
                          format: "email",
                          type: "string",
                        },
                        id: {
                          type: "string",
                        },
                        name: {
                          type: "string",
                        },
                      },
                      required: ["id", "name", "email"],
                      type: "object",
                    },
                  },
                },
                description: "Success",
              },
            },
            summary: "Update a user",
          },
        },
      },
    });
  });
});

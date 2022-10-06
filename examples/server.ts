import { makeApi } from "@zodios/core";
import { zodiosApp } from "@zodios/express";
import { serve, setup } from "swagger-ui-express";
import { z } from "zod";
import { toOpenApi } from "../src";

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

const app = zodiosApp(api);
const document = toOpenApi(api, {
  info: {
    title: "User API",
    version: "1.0.0",
    description: "A simple user API",
  },
  servers: [
    {
      url: "/api",
    },
  ],
});
app.use(`/docs/swagger.json`, (_, res) => res.json(document));
app.use("/docs", serve);
app.use("/docs", setup(undefined, { swaggerUrl: "/docs/swagger.json" }));

app.listen(3000);

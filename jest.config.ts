import type { Config } from "jest";

// Objet synchrone
const config: Config = {
  verbose: true,
  moduleFileExtensions: ["ts", "js", "json", "node"],
  rootDir: "./",
  testRegex: ".(spec|test).tsx?$",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  coverageDirectory: "./coverage",
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: "node",
};
export default config;

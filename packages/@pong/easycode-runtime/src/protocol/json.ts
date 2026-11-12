/**
 * JSON value types that match the `serde_json::Value` shape in easyCode.
 * Source: easyCode `app-server-protocol/schema/typescript/serde_json/JsonValue.ts`.
 */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

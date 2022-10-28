import { z } from "zod";

export function isZodType(
  t: z.ZodTypeAny,
  type: z.ZodFirstPartyTypeKind
): boolean {
  if (t._def?.typeName === type) {
    return true;
  }
  if (t._def?.innerType) {
    return isZodType(t._def.innerType, type);
  }
  return false;
}

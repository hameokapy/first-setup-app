import { z } from "zod";

export const apiResponseSchema = <T extends z.ZodType>(data: T) => (
    z.object({
        statusCode: z.number(),
        message: z.string(),
        data: data
    })
)
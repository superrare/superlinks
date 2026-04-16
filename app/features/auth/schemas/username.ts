import { z } from "zod/v4";

export const usernameSchema = z
	.string()
	.min(3, "Username must be at least 3 characters")
	.max(30, "Username must be at most 30 characters")
	.regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, hyphens, underscores only");

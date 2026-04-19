import { z } from 'zod'

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(8890),
  NEWS_DB_URL: z.string().url(),
  NEWS_INTERNAL_TOKEN: z.string().min(16),
  DASHBOARD_NOTIFICATION_URL: z.string().url(),
  DASHBOARD_NOTIFICATION_TOKEN: z.string().min(16),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY_FAILOVER: z.string().optional(),
  LLM_MODEL: z.string().default('claude-sonnet-4-6'),
  LLM_DAILY_TOKEN_BUDGET: z.coerce.number().default(500_000),
  MEDIA_STORAGE_PATH: z.string().default('./media'),
  LOG_LEVEL: z.string().default('info'),
})
export type Config = z.infer<typeof ConfigSchema>
export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid config:', parsed.error.flatten().fieldErrors)
    process.exit(1)
  }
  return parsed.data
}

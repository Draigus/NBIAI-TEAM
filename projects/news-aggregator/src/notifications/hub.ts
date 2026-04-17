import { loadConfig } from '../config.js'

const config = loadConfig()

async function post(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(config.DASHBOARD_NOTIFICATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nbi-internal-token': config.NEWS_INTERNAL_TOKEN,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[hub-notify] failed:', err)
  }
}

export async function notifyFeedDisabled(slug: string, name: string): Promise<void> {
  await post({
    type: 'warning',
    title: `News feed auto-disabled: ${name}`,
    message: `Source ${slug} exceeded 50% error rate over 7 days and was disabled. Review in the News admin panel.`,
    targetAdmins: true,
    dismissable: false,
  })
}

export async function notifyAuthFailover(runType: string): Promise<void> {
  await post({
    type: 'warning',
    title: 'News aggregator failed over to API key',
    message: `Max Pro auth failed during ${runType}. API key fallback engaged. Review Claude Code auth.`,
    targetAdmins: true,
    dismissable: false,
  })
}

export async function notifyGenerationFailed(runType: string, period: string): Promise<void> {
  await post({
    type: 'error',
    title: 'News aggregator generation failed',
    message: `Both Max Pro and API key auth failed during ${runType} for ${period}. No digest generated. Manual intervention required.`,
    targetAdmins: true,
    dismissable: false,
  })
}

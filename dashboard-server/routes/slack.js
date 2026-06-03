module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, verifySlackSignature, handleAppMention, loadClientAbbreviations, startAbbreviationRefresh } = ctx;

  // Cache init is handled by server.js startup, not here — avoids DB races in tests

  router.post('/api/slack/events', async (req, res) => {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    const timestamp = req.get('x-slack-request-timestamp');
    const signature = req.get('x-slack-signature');

    if (!signingSecret) {
      log('warn', 'Slack', 'SLACK_SIGNING_SECRET not configured');
      return res.status(503).json({ error: 'Slack integration not configured' });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (req.body?.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }

    res.json({ ok: true });

    const event = req.body?.event;
    if (event?.bot_id || event?.subtype === 'bot_message') return;
    if (event?.type !== 'app_mention' && event?.type !== 'message') return;

    try {
      await handleAppMention(event, pool, process.env.SLACK_BOT_TOKEN || '');
    } catch (err) {
      log('error', 'Slack', 'Failed to handle app_mention', { error: err.message });
    }
  });

  return router;
};

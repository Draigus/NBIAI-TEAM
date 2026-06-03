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

    // For message events (not app_mention), only process if the bot was @mentioned
    if (event.type === 'message' && !/<@[A-Z0-9]+>/.test(event.text || '')) return;

    try {
      await handleAppMention(event, pool, process.env.SLACK_BOT_TOKEN || '');
    } catch (err) {
      log('error', 'Slack', 'Failed to handle app_mention', { error: err.message });
    }
  });

  // Slash command — works in any channel/DM without the bot being a member
  router.post('/api/slack/command', async (req, res) => {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    const timestamp = req.get('x-slack-request-timestamp');
    const signature = req.get('x-slack-signature');

    if (!signingSecret) return res.status(503).send('Slack integration not configured');

    const rawBody = req.rawBody || require('querystring').stringify(req.body);
    if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return res.status(401).send('Invalid signature');
    }

    const text = req.body?.text || '';
    const userId = req.body?.user_id || '';
    const channelId = req.body?.channel_id || '';

    try {
      const { parseSlackMessage, getEntityCache, lookupSlackUser, buildSlackReply } = require('../lib/slack-bot');
      const entities = getEntityCache();
      const parsed = parseSlackMessage(text, entities);

      if (!parsed.title) {
        return res.json({
          response_type: 'ephemeral',
          text: '❌ Couldn\'t parse a task from that.\nTry: /worksage [client] [person] what needs doing',
        });
      }

      const clientId = parsed.clientMatch?.id || null;
      const clientName = parsed.clientMatch?.name || null;
      const clientResolved = !!parsed.clientMatch;
      const assigneeName = parsed.userMatch?.displayName || null;
      const assigneeResolved = !!parsed.userMatch;
      const itemType = parsed.itemType || 'task';

      let submittedBy = `slack:${userId}`;
      try {
        const realName = await lookupSlackUser(process.env.SLACK_BOT_TOKEN || '', userId);
        if (realName) submittedBy = realName;
      } catch { /* fall back */ }

      let item;
      let createdAsTask = false;

      if (clientResolved) {
        const { rows } = await pool.query(
          `INSERT INTO tasks (title, description, client_id, item_type, status, assignees, source)
           VALUES ($1, $2, $3, $4, 'Not started', $5, 'slack') RETURNING *`,
          [parsed.title, parsed.description || '', clientId, itemType, assigneeName ? [assigneeName] : []]
        );
        item = rows[0];
        createdAsTask = true;
      } else {
        const { rows } = await pool.query(
          `INSERT INTO task_queue (title, description, submitted_by, slack_user_id, slack_channel, client_id, assignee, item_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [parsed.title, parsed.description, submittedBy, userId, channelId,
           clientId, assigneeName, itemType]
        );
        item = rows[0];
      }

      const reply = buildSlackReply({
        title: parsed.title,
        itemType,
        clientName,
        assigneeName,
        assigneeResolved,
        clientResolved,
        queueId: item.id,
        createdAsTask,
      });

      return res.json({ response_type: 'in_channel', text: reply });
    } catch (err) {
      log('error', 'Slack', 'Slash command failed', { error: err.message });
      return res.json({ response_type: 'ephemeral', text: '❌ Something went wrong. Try again.' });
    }
  });

  return router;
};

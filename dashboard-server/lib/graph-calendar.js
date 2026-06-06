'use strict';

async function fetchCalendarEvents(msalClient, startDate, endDate) {
  if (!msalClient) return { events: [], error: 'MSAL not configured' };
  try {
    const tokenResult = await msalClient.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });
    if (!tokenResult || !tokenResult.accessToken) return { events: [], error: 'Token acquisition failed' };

    const userEmail = process.env.CC_CALENDAR_USER || 'gpryer@nbi-consulting.com';
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$orderby=start/dateTime&$top=50&$select=subject,start,end,location,attendees,onlineMeeting,webLink`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenResult.accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!resp.ok) {
      const body = await resp.text();
      return { events: [], error: `Graph API ${resp.status}: ${body.slice(0, 200)}` };
    }
    const data = await resp.json();
    return {
      events: (data.value || []).map(ev => ({
        title: ev.subject,
        start: ev.start.dateTime,
        end: ev.end.dateTime,
        location: ev.location?.displayName || '',
        attendees: (ev.attendees || []).map(a => a.emailAddress?.name || a.emailAddress?.address || ''),
        online_url: ev.onlineMeeting?.joinUrl || ev.webLink || '',
      })),
    };
  } catch (e) {
    return { events: [], error: e.message };
  }
}

module.exports = { fetchCalendarEvents };

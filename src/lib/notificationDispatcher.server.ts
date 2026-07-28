/**
 * notificationDispatcher.server.ts
 *
 * Simple webhook-based alerting. Used by the rules engine's ALERT action,
 * and available for the vault's anomalous-access detection
 * (detectAnomalousAccess in vaultAuditLog.server.ts) to actually notify
 * someone instead of only reaching a console.warn a human might never see.
 *
 * Configured via NOTIFICATION_WEBHOOK_URL. Supports Slack's incoming
 * webhook payload shape by default (the most common target for this kind
 * of alert); set NOTIFICATION_WEBHOOK_FORMAT=generic for a plain JSON body
 * instead if targeting something else (a custom endpoint, PagerDuty
 * integration, etc.).
 */

export interface Notification {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  context?: Record<string, string | number>;
}

function buildSlackPayload(n: Notification): any {
  const emoji = n.severity === 'critical' ? ':rotating_light:' : n.severity === 'warning' ? ':warning:' : ':information_source:';
  const contextLines = n.context
    ? Object.entries(n.context)
        .map(([k, v]) => `*${k}*: ${v}`)
        .join('\n')
    : '';
  return {
    text: `${emoji} *${n.title}*\n${n.message}${contextLines ? `\n${contextLines}` : ''}`,
  };
}

export async function sendNotification(notification: Notification): Promise<{ sent: boolean; reason?: string }> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) {
    // eslint-disable-next-line no-console
    console.warn(`[notification:${notification.severity}] ${notification.title} -- ${notification.message} (NOTIFICATION_WEBHOOK_URL not set, not delivered)`);
    return { sent: false, reason: 'NOTIFICATION_WEBHOOK_URL not configured' };
  }

  const format = process.env.NOTIFICATION_WEBHOOK_FORMAT ?? 'slack';
  const payload = format === 'slack' ? buildSlackPayload(notification) : notification;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`[notification] Webhook delivery failed (${res.status}): ${await res.text()}`);
      return { sent: false, reason: `Webhook responded ${res.status}` };
    }
    return { sent: true };
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[notification] Webhook delivery threw:', err.message);
    return { sent: false, reason: err.message };
  }
}

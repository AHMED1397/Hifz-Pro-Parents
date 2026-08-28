// Supabase Edge Function: push
// -----------------------------------------------------------------------------
// Sends an Expo push notification whenever a row is inserted into the
// `notifications` table.
//
// Wire it up:
//   1. supabase functions deploy push
//   2. supabase secrets set EXPO_ACCESS_TOKEN=<token from expo.dev → Access Tokens>
//   3. Dashboard → Database → Webhooks → new hook:
//        table = notifications, event = Insert, target = this function (POST),
//        add header "Authorization: Bearer <service_role key>".
//
// It reads the recipient's device tokens (device_tokens table) and calls the
// Expo Push API, then stamps notifications.sent_at.
// -----------------------------------------------------------------------------
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationRow {
  id: string;
  recipient_id: string;
  recipient_type: 'teacher' | 'parent';
  title: string;
  body: string;
  data: Record<string, unknown> | null;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: NotificationRow;
  schema: string;
  old_record: NotificationRow | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN'); // optional but recommended

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;

    if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
      return new Response('ignored', { status: 200 });
    }
    const n = payload.record;

    // 1. Look up the recipient's enabled device tokens.
    const { data: tokens, error } = await admin
      .from('device_tokens')
      .select('expo_token')
      .eq('user_id', n.recipient_id)
      .eq('enabled', true);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response('no tokens', { status: 200 });
    }

    // 2. Build one Expo push message per device.
    const messages = tokens.map((t) => ({
      to: t.expo_token,
      sound: 'default',
      title: n.title,
      body: n.body,
      data: n.data ?? {},
      channelId: 'default',
    }));

    // 3. Send to the Expo push service.
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
    });
    const result = await res.json();

    // 4. Mark the notification as sent.
    await admin
      .from('notifications')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', n.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('push error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

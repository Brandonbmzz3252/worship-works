import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';

initializeApp();

const db = getFirestore();
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function tokensForChurch(churchId: string, excludeUid?: string) {
  const snap = await db.collection('users').where('churchId', '==', churchId).get();
  const tokens: string[] = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (
      doc.id !== excludeUid &&
      typeof data.pushToken === 'string' &&
      data.pushToken.length > 0
    ) {
      tokens.push(data.pushToken);
    }
  });
  return tokens;
}

async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  if (tokens.length === 0) return;
  for (let i = 0; i < tokens.length; i += 100) {
    const messages = tokens.slice(i, i + 100).map((to) => ({
      to,
      sound: 'default',
      title,
      body,
      data,
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        logger.error('Expo push request failed', { status: res.status });
      }
    } catch (err) {
      logger.error('Expo push request error', err);
    }
  }
}

function churchIdOf(data: Record<string, unknown> | undefined): string | undefined {
  return data && typeof data.churchId === 'string' ? data.churchId : undefined;
}

export const onSongCreated = onDocumentCreated('songs/{songId}', async (event) => {
  const data = event.data?.data();
  const churchId = churchIdOf(data);
  if (!data || !churchId) return;
  const title = typeof data.title === 'string' ? data.title : 'Song';
  const sender = typeof data.uploadedBy === 'string' ? data.uploadedBy : undefined;
  const tokens = await tokensForChurch(churchId, sender);
  await sendPush(tokens, 'New song added', `${title} was added to the music library.`, {
    url: '/songs',
  });
});

export const onRosterCreated = onDocumentCreated('roster/{rosterId}', async (event) => {
  const data = event.data?.data();
  const churchId = churchIdOf(data);
  if (!data || !churchId) return;
  const sender = typeof data.createdBy === 'string' ? data.createdBy : undefined;
  let dateText = '';
  const stamp = data.serviceDate as { seconds?: number } | undefined;
  if (stamp && typeof stamp.seconds === 'number') {
    const d = new Date(stamp.seconds * 1000);
    dateText = ` for ${d.toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })}`;
  }
  const tokens = await tokensForChurch(churchId, sender);
  await sendPush(
    tokens,
    'Duty roster updated',
    `A new service duty${dateText} has been scheduled.`,
    { url: '/roster' }
  );
});

export const onEventCreated = onDocumentCreated('events/{eventId}', async (event) => {
  const data = event.data?.data();
  const churchId = churchIdOf(data);
  if (!data || !churchId) return;
  const title = typeof data.title === 'string' ? data.title : 'Event';
  const tokens = await tokensForChurch(churchId);
  await sendPush(tokens, 'New event', title, { url: '/schedule' });
});

export const onChatMessageCreated = onDocumentCreated('messages/{messageId}', async (event) => {
  const data = event.data?.data();
  const churchId = churchIdOf(data);
  if (!data || !churchId) return;
  const sender = typeof data.userId === 'string' ? data.userId : undefined;
  const senderName = typeof data.userName === 'string' ? data.userName : 'Someone';
  let body = typeof data.text === 'string' ? data.text : '';
  if (!body && typeof data.fileName === 'string') {
    body = `Sent a file: ${data.fileName}`;
  }
  if (body.length > 100) body = `${body.slice(0, 100)}…`;
  const tokens = await tokensForChurch(churchId, sender);
  await sendPush(tokens, senderName, body || 'Sent a message.', { url: '/chat' });
});
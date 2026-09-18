"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onChatMessageCreated = exports.onEventCreated = exports.onRosterCreated = exports.onSongCreated = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
async function tokensForChurch(churchId, excludeUid) {
    const snap = await db.collection('users').where('churchId', '==', churchId).get();
    const tokens = [];
    snap.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== excludeUid &&
            typeof data.pushToken === 'string' &&
            data.pushToken.length > 0) {
            tokens.push(data.pushToken);
        }
    });
    return tokens;
}
async function sendPush(tokens, title, body, data) {
    if (tokens.length === 0)
        return;
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
                firebase_functions_1.logger.error('Expo push request failed', { status: res.status });
            }
        }
        catch (err) {
            firebase_functions_1.logger.error('Expo push request error', err);
        }
    }
}
function churchIdOf(data) {
    return data && typeof data.churchId === 'string' ? data.churchId : undefined;
}
exports.onSongCreated = (0, firestore_2.onDocumentCreated)('songs/{songId}', async (event) => {
    const data = event.data?.data();
    const churchId = churchIdOf(data);
    if (!data || !churchId)
        return;
    const title = typeof data.title === 'string' ? data.title : 'Song';
    const sender = typeof data.uploadedBy === 'string' ? data.uploadedBy : undefined;
    const tokens = await tokensForChurch(churchId, sender);
    await sendPush(tokens, 'New song added', `${title} was added to the music library.`, {
        url: '/songs',
    });
});
exports.onRosterCreated = (0, firestore_2.onDocumentCreated)('roster/{rosterId}', async (event) => {
    const data = event.data?.data();
    const churchId = churchIdOf(data);
    if (!data || !churchId)
        return;
    const sender = typeof data.createdBy === 'string' ? data.createdBy : undefined;
    let dateText = '';
    const stamp = data.serviceDate;
    if (stamp && typeof stamp.seconds === 'number') {
        const d = new Date(stamp.seconds * 1000);
        dateText = ` for ${d.toLocaleDateString('en-ZA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        })}`;
    }
    const tokens = await tokensForChurch(churchId, sender);
    await sendPush(tokens, 'Duty roster updated', `A new service duty${dateText} has been scheduled.`, { url: '/roster' });
});
exports.onEventCreated = (0, firestore_2.onDocumentCreated)('events/{eventId}', async (event) => {
    const data = event.data?.data();
    const churchId = churchIdOf(data);
    if (!data || !churchId)
        return;
    const title = typeof data.title === 'string' ? data.title : 'Event';
    const tokens = await tokensForChurch(churchId);
    await sendPush(tokens, 'New event', title, { url: '/schedule' });
});
exports.onChatMessageCreated = (0, firestore_2.onDocumentCreated)('messages/{messageId}', async (event) => {
    const data = event.data?.data();
    const churchId = churchIdOf(data);
    if (!data || !churchId)
        return;
    const sender = typeof data.userId === 'string' ? data.userId : undefined;
    const senderName = typeof data.userName === 'string' ? data.userName : 'Someone';
    let body = typeof data.text === 'string' ? data.text : '';
    if (!body && typeof data.fileName === 'string') {
        body = `Sent a file: ${data.fileName}`;
    }
    if (body.length > 100)
        body = `${body.slice(0, 100)}…`;
    const tokens = await tokensForChurch(churchId, sender);
    await sendPush(tokens, senderName, body || 'Sent a message.', { url: '/chat' });
});
//# sourceMappingURL=index.js.map
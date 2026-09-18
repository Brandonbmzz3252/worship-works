import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  deleteField,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Query,
  type QuerySnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTaskSnapshot,
} from 'firebase/storage';

import { db, storage, auth } from './firebase';
import { slugifyChurch, getChurchId, requireChurchId, setSessionChurchId } from './session';
import type {
  Song,
  Setlist,
  SetlistEntry,
  BandEvent,
  ChatMessage,
  UserProfile,
  ViewedPage,
  SongCreateInput,
  SetlistCreateInput,
  EventCreateInput,
  RosterEntry,
  RosterCreateInput,
  MemberDir,
  MemberCreateInput,
  MemberRole,
  Role,
  OtherInstrument,
} from './types';

type QuerySnap = QuerySnapshot<DocumentData>;

function fromDoc<T>(id: string, data: DocumentData): T {
  return { id, ...data } as T;
}

function mapSnap<T>(snap: QuerySnap): T[] {
  return snap.docs.map((d) => fromDoc<T>(d.id, d.data()));
}

function cleanData(data: object): DocumentData {
  const out: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function churchData(extra: DocumentData): DocumentData {
  return cleanData({ ...extra, churchId: requireChurchId() });
}

/* ------------------------------------------------------------------
   query error surfacing
-------------------------------------------------------------------------- */

type QueryErrorHandler = (label: string, err: unknown) => void;
let queryErrorHandler: QueryErrorHandler | null = null;

export function setQueryErrorHandler(handler: QueryErrorHandler | null) {
  queryErrorHandler = handler;
}

function reportQueryError(label: string, err: unknown) {
  if (queryErrorHandler) {
    queryErrorHandler(label, err);
  } else {
    console.error(`[${label}] query failed`, err);
  }
}

function subscribeQuery<T>(
  churchId: string,
  label: string,
  q: Query<DocumentData>,
  cb: (items: T[]) => void,
  mapper: (snap: QuerySnap) => T[]
): Unsubscribe {
  if (!churchId) {
    cb([]);
    return () => {};
  }
  return onSnapshot(
    q,
    (snap) => cb(mapper(snap)),
    (err) => reportQueryError(label, err)
  );
}

/* ------------------------------------------------------------------
   songs
------------------------------------------------------------------ */

export type SongUpdateInput = Partial<Omit<Song, 'id' | 'uploadedAt' | 'uploadedBy'>>;

export function subscribeSongs(churchId: string, cb: (songs: Song[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'songs'),
    where('churchId', '==', churchId),
    orderBy('uploadedAt', 'desc')
  );
  return subscribeQuery(churchId, 'Songs', q, cb, mapSnap<Song>);
}

export async function getSong(songId: string): Promise<Song | null> {
  const snap = await getDoc(doc(db, 'songs', songId));
  return snap.exists() ? fromDoc<Song>(snap.id, snap.data()) : null;
}

export async function uploadSongFile(
  localUri: string,
  fileName: string,
  mimeType?: string | null,
  onProgress?: (fraction: number) => void
): Promise<{ fileUrl: string; filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  const uid = auth.currentUser!.uid;
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  const storagePath = `songs/${uid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  const response = await fetch(localUri);
  const blob = await response.blob();
  const resolvedMime = mimeType || 'application/octet-stream';
  const taskResult = await new Promise<UploadTaskSnapshot>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, { contentType: resolvedMime });
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(snap.bytesTransferred / snap.totalBytes);
        }
      },
      (error) => reject(error),
      () => resolve(task.snapshot)
    );
  });
  const fileUrl = await getDownloadURL(taskResult.ref);
  return {
    fileUrl,
    filePath: storagePath,
    fileName,
    fileSize: taskResult.bytesTransferred,
    mimeType: resolvedMime,
  };
}

export async function createSong(input: SongCreateInput): Promise<string> {
  const uid = auth.currentUser!.uid;
  const ref = await addDoc(collection(db, 'songs'), churchData({
    title: input.title,
    artist: input.artist,
    key: input.key,
    notes: input.notes,
    link: input.link,
    filePath: input.filePath,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
uploadedBy: uid,
    uploadedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateSong(songId: string, input: SongUpdateInput): Promise<void> {
  await updateDoc(doc(db, 'songs', songId), cleanData({ ...input }));
}

export async function deleteSong(songId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'songs', songId));
  if (snap.exists()) {
    const data = snap.data() as Song;
    if (data.filePath) {
      try {
        await deleteObject(ref(storage, data.filePath));
      } catch {
        // file already gone - ignore
      }
    }
  }
  await deleteDoc(doc(db, 'songs', songId));
}

/** Delete every doc in a collection belonging to a church, removing any storage file per doc. */
async function wipeChurchCollection(
  name: string,
  churchId: string,
  fileField?: string
): Promise<void> {
  const q = query(collection(db, name), where('churchId', '==', churchId));
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map(async (d) => {
      if (fileField) {
        const filePath = (d.data() as DocumentData)[fileField] as string | undefined;
        if (filePath) {
          try {
            await deleteObject(ref(storage, filePath));
          } catch {
            // file already gone - ignore
          }
        }
      }
      await deleteDoc(d.ref);
    })
  );
}

/**
 * Admin-only: delete a whole church group. The caller must confirm by typing
 * the group's display name and its current access code. Wipes all group data
 * and storage files, detaches every member and the admin, then removes the
 * /churches doc. The current session is left with no group.
 */
export async function deleteGroup(enteredName: string, enteredCode: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to delete a group.');

  const churchId = requireChurchId();
  if (!churchId) throw new Error('You are not in a group.');

  const me = await getUserProfile(user.uid);
  if (me?.role !== 'admin' || me.churchId !== churchId) {
    throw new Error('Only the admin of this group can delete it.');
  }

  const churchDoc = doc(db, 'churches', churchId);
  const churchSnap = await getDoc(churchDoc);
  if (!churchSnap.exists()) throw new Error('Group not found.');
  const stored = churchSnap.data() as { name?: string; accessCode?: string };

  if (!stored.name || slugifyChurch(stored.name) !== slugifyChurch(enteredName)) {
    throw new Error('The group name you typed does not match this group.');
  }
  if (stored.accessCode && stored.accessCode.trim() !== enteredCode.trim()) {
    throw new Error('The access code you typed is incorrect.');
  }

  // Wipe group data (files too).
  await wipeChurchCollection('songs', churchId, 'filePath');
  await wipeChurchCollection('messages', churchId, 'filePath');
  await wipeChurchCollection('setlists', churchId);
  await wipeChurchCollection('events', churchId);
  await wipeChurchCollection('roster', churchId);
  await wipeChurchCollection('members', churchId);
  await wipeChurchCollection('views', churchId);

  // Remove the church doc while the admin is still a member (rules check it).
  await deleteDoc(churchDoc);

  // Detach every other user first (admin still attached so rules pass),
  // then the admin's own record last.
  const usersQ = query(collection(db, 'users'), where('churchId', '==', churchId));
  const usersSnap = await getDocs(usersQ);
  const others = usersSnap.docs.filter((d) => d.id !== user.uid);
  await Promise.all(
    others.map((d) =>
      updateDoc(d.ref, {
        churchId: deleteField(),
        groups: (d.data().groups ?? []).filter(
          (g: { id: string }) => g.id !== churchId
        ),
      })
    )
  );
  await updateDoc(doc(db, 'users', user.uid), {
    churchId: deleteField(),
    groups: (me.groups ?? []).filter((g) => g.id !== churchId),
  });

  setSessionChurchId(null);
}

/* ------------------------------------------------------------------
   setlists
------------------------------------------------------------------ */

export type SetlistUpdateInput = Omit<Partial<Setlist>, 'id' | 'createdBy' | 'createdAt' | 'date'> & {
  date?: Timestamp | Date;
};

export function subscribeSetlists(churchId: string, cb: (list: Setlist[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'setlists'),
    where('churchId', '==', churchId),
    orderBy('date', 'desc')
  );
  return subscribeQuery(churchId, 'Setlists', q, cb, mapSnap<Setlist>);
}

export async function getSetlist(setlistId: string): Promise<Setlist | null> {
  const snap = await getDoc(doc(db, 'setlists', setlistId));
  return snap.exists() ? fromDoc<Setlist>(snap.id, snap.data()) : null;
}

export function subscribeSetlist(
  setlistId: string,
  cb: (s: Setlist | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'setlists', setlistId),
    (snap) => cb(snap.exists() ? fromDoc<Setlist>(snap.id, snap.data()) : null),
    (err) => reportQueryError('Setlist', err)
  );
}

export async function createSetlist(input: SetlistCreateInput): Promise<string> {
  const uid = auth.currentUser!.uid;
  const ref = await addDoc(collection(db, 'setlists'), churchData({
    title: input.title,
    kind: input.kind,
    date: Timestamp.fromDate(input.date),
    entries: input.entries.map((e) => ({ ...e })),
    createdBy: uid,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateSetlist(setlistId: string, input: SetlistUpdateInput): Promise<void> {
  const patch: DocumentData = { ...input };
  if (patch.date && patch.date instanceof Date) {
    patch.date = Timestamp.fromDate(patch.date);
  }
  if (Array.isArray(patch.entries)) {
    patch.entries = (patch.entries as SetlistEntry[]).map((e) => ({ ...e }));
  }
  await updateDoc(doc(db, 'setlists', setlistId), cleanData(patch));
}

export async function deleteSetlist(setlistId: string): Promise<void> {
  await deleteDoc(doc(db, 'setlists', setlistId));
}

/* ------------------------------------------------------------------
   events
------------------------------------------------------------------ */

export type EventUpdateInput = Partial<Omit<BandEvent, 'id' | 'start' | 'end'>> & {
  start?: Date;
  end?: Date | null;
};

export function subscribeEvents(churchId: string, cb: (events: BandEvent[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'events'),
    where('churchId', '==', churchId),
    orderBy('start', 'desc')
  );
  return subscribeQuery(churchId, 'Schedule', q, cb, mapSnap<BandEvent>);
}

export async function createEvent(input: EventCreateInput): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), churchData({
    title: input.title,
    kind: input.kind,
    start: Timestamp.fromDate(input.start),
    end: input.end ? Timestamp.fromDate(input.end) : null,
    location: input.location,
    notes: input.notes,
  }));
  return ref.id;
}

export async function getEvent(eventId: string): Promise<BandEvent | null> {
  const snap = await getDoc(doc(db, 'events', eventId));
  return snap.exists() ? fromDoc<BandEvent>(snap.id, snap.data()) : null;
}

export async function updateEvent(eventId: string, input: EventUpdateInput): Promise<void> {
  const patch: DocumentData = { ...input };
  if (patch.start instanceof Date) {
    patch.start = Timestamp.fromDate(patch.start);
  }
  if (patch.end instanceof Date) {
    patch.end = Timestamp.fromDate(patch.end);
  }
  if (patch.end === null) {
    patch.end = null;
  }
  delete patch.id;
  await updateDoc(doc(db, 'events', eventId), cleanData(patch));
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
}

/* ------------------------------------------------------------------
   chat messages
------------------------------------------------------------------ */

export function subscribeMessages(churchId: string, cb: (msgs: ChatMessage[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'messages'),
    where('churchId', '==', churchId),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return subscribeQuery(churchId, 'Chat', q, cb, mapSnap<ChatMessage>);
}

export async function sendMessage(
  text: string,
  file?: { fileUrl: string; filePath: string; fileName: string; fileSize: number }
): Promise<void> {
  const user = auth.currentUser!;
  await addDoc(collection(db, 'messages'), churchData({
    text,
    fileUrl: file?.fileUrl,
    filePath: file?.filePath,
    fileName: file?.fileName,
    fileSize: file?.fileSize,
    userId: user.uid,
    userName: user.displayName || user.email?.split('@')[0] || 'Member',
    createdAt: serverTimestamp(),
  }));
}

export async function uploadChatFile(
  localUri: string,
  fileName: string,
  onProgress?: (fraction: number) => void
): Promise<{ fileUrl: string; filePath: string; fileName: string; fileSize: number }> {
  const uid = auth.currentUser!.uid;
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  const storagePath = `chat/${uid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  const response = await fetch(localUri);
  const blob = await response.blob();
  const mimeType = blob.type || `application/${extension}`;
  const taskResult = await new Promise<UploadTaskSnapshot>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, { contentType: mimeType });
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(snap.bytesTransferred / snap.totalBytes);
        }
      },
      (error) => reject(error),
      () => resolve(task.snapshot)
    );
  });
  const fileUrl = await getDownloadURL(taskResult.ref);
  return {
    fileUrl,
    filePath: storagePath,
    fileName,
    fileSize: taskResult.bytesTransferred,
  };
}

export async function deleteChatMessage(
  messageId: string,
  filePath?: string
): Promise<void> {
  if (filePath) {
    try {
      await deleteObject(ref(storage, filePath));
    } catch {
      // file already gone - ignore
    }
  }
  await deleteDoc(doc(db, 'messages', messageId));
}

/* ------------------------------------------------------------------
   duty roster
------------------------------------------------------------------ */

export type RosterUpdateInput =
  Partial<Omit<RosterEntry, 'id' | 'createdBy' | 'createdAt' | 'serviceDate'>> & {
    serviceDate?: Timestamp | Date;
  };

export function subscribeRosterForMonth(
  churchId: string,
  year: number,
  month: number,
  cb: (entries: RosterEntry[]) => void
): Unsubscribe {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const q = query(
    collection(db, 'roster'),
    where('churchId', '==', churchId),
    where('serviceDate', '>=', Timestamp.fromDate(start)),
    where('serviceDate', '<', Timestamp.fromDate(end)),
    orderBy('serviceDate', 'asc')
  );
  return subscribeQuery(churchId, 'Roster', q, cb, mapSnap<RosterEntry>);
}

export async function getRosterEntry(entryId: string): Promise<RosterEntry | null> {
  const snap = await getDoc(doc(db, 'roster', entryId));
  return snap.exists() ? fromDoc<RosterEntry>(snap.id, snap.data()) : null;
}

export async function createRosterEntry(input: RosterCreateInput): Promise<string> {
  const uid = auth.currentUser!.uid;
  const ref = await addDoc(collection(db, 'roster'), churchData({
    serviceDate: Timestamp.fromDate(input.serviceDate),
    leader: input.leader,
    band: { ...input.band },
    singers: [...input.singers],
    other: (input.other ?? []).map((o) => ({ instrument: o.instrument, name: o.name })),
    createdBy: uid,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateRosterEntry(
  entryId: string,
  input: RosterUpdateInput
): Promise<void> {
  const patch: DocumentData = { ...input };
  if (patch.serviceDate && patch.serviceDate instanceof Date) {
    patch.serviceDate = Timestamp.fromDate(patch.serviceDate);
  }
  if (patch.band) {
    patch.band = { ...(patch.band as Record<string, string>) };
  }
  if (Array.isArray(patch.singers)) {
    patch.singers = [...(patch.singers as string[])];
  }
  if (Array.isArray(patch.other)) {
    patch.other = (patch.other as OtherInstrument[]).map((o) => ({
      instrument: o.instrument,
      name: o.name,
    }));
  }
  await updateDoc(doc(db, 'roster', entryId), cleanData(patch));
}

export async function deleteRosterEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'roster', entryId));
}

/* ------------------------------------------------------------------
   members directory
------------------------------------------------------------------ */

export function subscribeMembers(churchId: string, cb: (members: MemberDir[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'members'),
    where('churchId', '==', churchId),
    orderBy('name', 'asc')
  );
  return subscribeQuery(churchId, 'Members', q, cb, mapSnap<MemberDir>);
}

export async function createMember(input: MemberCreateInput): Promise<string> {
  const uid = auth.currentUser!.uid;
  const ref = await addDoc(collection(db, 'members'), churchData({
    name: input.name.trim(),
    role: input.role,
    instrument: input.instrument?.trim() || undefined,
    createdBy: uid,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateMember(
  memberId: string,
  input: { name: string; role: MemberRole; instrument?: string }
): Promise<void> {
  const patch: DocumentData = {
    name: input.name.trim(),
    role: input.role,
    instrument: input.instrument?.trim() || undefined,
  };
  await updateDoc(doc(db, 'members', memberId), cleanData(patch));
}

export async function deleteMember(memberId: string): Promise<void> {
  await deleteDoc(doc(db, 'members', memberId));
}

/* ------------------------------------------------------------------
   user profile
------------------------------------------------------------------ */

export function subscribeUserProfile(
  uid: string,
  cb: (profile: UserProfile | null) => void
): Unsubscribe {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (snap) => {
    cb(snap.exists() ? fromDoc<UserProfile>(snap.id, snap.data()) : null);
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? fromDoc<UserProfile>(snap.id, snap.data()) : null;
}

export function subscribeAllUsers(churchId: string, cb: (users: UserProfile[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'users'),
    where('churchId', '==', churchId),
    orderBy('displayName', 'asc')
  );
  return subscribeQuery(churchId, 'Users', q, cb, mapSnap<UserProfile>);
}

export async function setUserRole(uid: string, role: Role): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function updateUserDates(
  uid: string,
  dates: { birthday?: string; anniversary?: string }
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), cleanData({ ...dates }));
}

/* ------------------------------------------------------------------
   view tracking
------------------------------------------------------------------ */

export interface ViewRecord {
  id: string;
  churchId: string;
  uid: string;
  displayName: string;
  page: ViewedPage;
  viewedAt: Timestamp;
}

const viewedToday = new Set<string>();

/** Record that the current user opened a screen (idempotent, once per user/page/day). */
export async function recordView(page: ViewedPage): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const churchId = getChurchId();
  if (!churchId) return;
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const docId = `${churchId}:${page}:${user.uid}`;
  const dedupeKey = `${docId}:${dayKey}`;
  if (viewedToday.has(dedupeKey)) return;
  viewedToday.add(dedupeKey);
  try {
    await setDoc(doc(db, 'views', docId), {
      churchId,
      uid: user.uid,
      displayName: user.displayName ?? '',
      page,
      viewedAt: serverTimestamp(),
    });
  } catch {
    // best-effort tracking - never block the screen on a view write
  }
}

export function subscribeViews(churchId: string, cb: (views: ViewRecord[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'views'),
    where('churchId', '==', churchId),
    orderBy('viewedAt', 'desc'),
    limit(200)
  );
  return subscribeQuery(churchId, 'Activity', q, cb, mapSnap<ViewRecord>);
}

/* ------------------------------------------------------------------
   storage download
------------------------------------------------------------------ */

export async function getSongDownloadUrl(filePath: string): Promise<string> {
  return getDownloadURL(ref(storage, filePath));
}

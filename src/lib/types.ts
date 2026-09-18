import type { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'member';

export const BAND_ROLES = [
  'Drummer',
  'Bass',
  'Keyboard 1',
  'Keyboard 2',
  'Synth',
  'Guitar 1',
  'Guitar 2',
] as const;

export type BandRole = (typeof BAND_ROLES)[number];

export const SINGER_ROLE = 'singer';
export const SINGER_SLOTS = 10;
export const TECH_TEAM_ROLE = 'Tech Team';
export const OTHER_ROLE = 'Other';

export const BAND_SECTIONS = ['Drummer', 'Bass', 'Keyboard', 'Guitar'] as const;
export type BandSection = (typeof BAND_SECTIONS)[number];

export type MemberRole = typeof SINGER_ROLE | BandSection | typeof TECH_TEAM_ROLE | typeof OTHER_ROLE;

export const MEMBER_ROLES: MemberRole[] = [
  SINGER_ROLE,
  ...BAND_SECTIONS,
  TECH_TEAM_ROLE,
  OTHER_ROLE,
];

export const POSITIONS_FOR_SECTION: Record<BandSection, BandRole[]> = {
  Drummer: ['Drummer'],
  Bass: ['Bass'],
  Keyboard: ['Keyboard 1', 'Keyboard 2', 'Synth'],
  Guitar: ['Guitar 1', 'Guitar 2'],
};

export function sectionForPosition(position: BandRole): BandSection {
  return (
    (Object.keys(POSITIONS_FOR_SECTION) as BandSection[]).find((section) =>
      POSITIONS_FOR_SECTION[section].includes(position)
    ) ?? 'Keyboard'
  );
}

export interface MemberDir {
  id: string;
  name: string;
  role: MemberRole;
  instrument?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface MemberCreateInput {
  name: string;
  role: MemberRole;
  instrument?: string;
}

export interface Church {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp;
}

/** A church group this user has joined, for seamless switching. */
export interface UserGroupMembership {
  id: string;
  name: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  churchId?: string;
  /** Every group this user has joined (id + display name). */
  groups?: UserGroupMembership[];
  instrument?: string;
  /** Month and day only, as "MM-DD". */
  birthday?: string;
  /** Month and day only, as "MM-DD". */
  anniversary?: string;
  createdAt: Timestamp;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  notes: string;
  link?: string;
  filePath?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

export const SETLIST_KINDS = ['Sunday Service', 'Other'] as const;
export type SetlistKind = (typeof SETLIST_KINDS)[number];

/** Default setlist sections shown when creating a new setlist. */
export const SETLIST_SECTIONS = ['Praise', 'Worship', 'Altar Call', 'Offering', 'Other'] as const;
/** A setlist section name. Free-form, e.g. Praise, Worship, Offering, Altar Call. */
export type SetlistSection = string;

/** Musical keys as displayed in the key dropdown (sharps with flat alternates, plus Bb). */
export const MUSIC_KEYS = [
  'C',
  'C#/Db',
  'D',
  'D#/Eb',
  'E',
  'F',
  'F#/Gb',
  'G',
  'G#/Ab',
  'A',
  'A#/Bb',
  'Bb',
  'B',
];

export interface SetlistEntry {
  section: SetlistSection;
  title: string;
  key: string;
  tempo: string;
  /** Keys the song modulates to, in order. */
  keyChanges?: string[];
  /** Extra note, mainly for Other sections (e.g. "Communion"). */
  note?: string;
}

export type ViewedPage = 'roster' | 'schedule' | 'setlist' | 'songs' | 'chat';

export interface Setlist {
  id: string;
  title: string;
  kind: SetlistKind;
  date: Timestamp;
  entries: SetlistEntry[];
  createdBy: string;
  createdAt: Timestamp;
}

export type EventKind = 'Rehearsal' | 'Service' | 'Other';

export interface BandEvent {
  id: string;
  title: string;
  kind: EventKind;
  start: Timestamp;
  end?: Timestamp;
  location: string;
  notes: string;
}

export interface ChatFileInfo {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
}

export interface SongCreateInput {
  title: string;
  artist: string;
  key: string;
  notes: string;
  link?: string;
  filePath?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface SetlistCreateInput {
  title: string;
  kind: SetlistKind;
  date: Date;
  entries: SetlistEntry[];
}

export interface EventCreateInput {
  title: string;
  kind: EventKind;
  start: Date;
  end?: Date | null;
  location: string;
  notes: string;
}

export interface RosterEntry {
  id: string;
  serviceDate: Timestamp;
  leader: string;
  band: Record<string, string>;
  singers: string[];
  other?: OtherInstrument[];
  createdBy: string;
  createdAt: Timestamp;
}

export type OtherInstrument = {
  instrument: string;
  name: string;
};

export interface RosterCreateInput {
  serviceDate: Date;
  leader: string;
  band: Record<string, string>;
  singers: string[];
  other?: OtherInstrument[];
}
let currentChurchId: string | null = null;

export function slugifyChurch(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function setSessionChurchId(id: string | null): void {
  currentChurchId = id;
}

export function getChurchId(): string | null {
  return currentChurchId;
}

export function requireChurchId(): string {
  if (!currentChurchId) {
    throw new Error('Not connected to a church yet.');
  }
  return currentChurchId;
}
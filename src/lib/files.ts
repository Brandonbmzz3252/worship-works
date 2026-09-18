import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getSongDownloadUrl } from './store';

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, '_');
  return cleaned || 'song';
}

function browserDownload(url: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFileName(fileName);
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export async function downloadAndShareSong(opts: {
  filePath?: string;
  fileName?: string;
  mimeType?: string;
}): Promise<string | null> {
  if (!opts.filePath) return null;
  const url = await getSongDownloadUrl(opts.filePath);
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      navigator
        .share({
          title: opts.fileName ?? 'Song',
          url,
        })
        .catch(() => {
          browserDownload(url, opts.fileName || 'song');
        });
    } else {
      browserDownload(url, opts.fileName || 'song');
    }
    return url;
  }
  const dir = `${FileSystem.cacheDirectory}band-songs/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destination = `${dir}${safeFileName(opts.fileName || 'song')}`;
  const result = await FileSystem.downloadAsync(url, destination);
  if (result.status !== 200) {
    throw new Error('Download failed');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: opts.mimeType || 'application/octet-stream',
    });
  }
  return result.uri;
}

export async function downloadSongOnly(opts: { filePath?: string; fileName?: string }): Promise<string | null> {
  if (!opts.filePath) return null;
  const url = await getSongDownloadUrl(opts.filePath);
  if (Platform.OS === 'web') {
    browserDownload(url, opts.fileName || 'song');
    return url;
  }
  const dir = `${FileSystem.cacheDirectory}band-songs/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destination = `${dir}${safeFileName(opts.fileName || 'song')}`;
  const result = await FileSystem.downloadAsync(url, destination);
  if (result.status !== 200) {
    throw new Error('Download failed');
  }
  return result.uri;
}
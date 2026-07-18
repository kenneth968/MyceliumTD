import { AudioFailureRegistry, MusicTrack, resolveMusicTrackUrl } from './audioManager';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`FAIL: ${message}`);
}

assertEqual(
  resolveMusicTrackUrl('./assets/music', MusicTrack.Chantarelle),
  './assets/music/the-chantarelle.mp3',
  'packaged URL'
);

const failures = new AudioFailureRegistry();
assertEqual(failures.record(MusicTrack.Chantarelle), true, 'first failure is reported');
assertEqual(failures.record(MusicTrack.Chantarelle), false, 'duplicate failure is suppressed');

console.log('audio manager tests passed');

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertLoopSheetsPresent,
  summarizeLoopSheets,
  type LoopSheetStatus,
} from '@/lib/catalog/loop-sheets';
import { createTestCatalog } from '@/lib/catalog/test-helpers';
import { fakePlayer, fakeSeed } from '@/lib/providers/fake-source';
import { parsePlayerId } from '@/lib/domain/player';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('loop sheet report', () => {
  it('summarizes missing sheets', () => {
    const statuses: LoopSheetStatus[] = [
      {
        sharedId: 'loop:a',
        fileName: 'a.png',
        filePath: '/tmp/a.png',
        present: true,
        samplePlayerId: '1',
        upstreamUrl: 'https://images-v2.renderz.app/a',
      },
      {
        sharedId: 'loop:b',
        fileName: 'b.png',
        filePath: '/tmp/b.png',
        present: false,
        samplePlayerId: '2',
        upstreamUrl: 'https://images-v2.renderz.app/b',
      },
    ];
    const report = summarizeLoopSheets(statuses);
    expect(report.total).toBe(2);
    expect(report.present).toBe(1);
    expect(report.missing.map((row) => row.fileName)).toEqual(['b.png']);
  });

  it('assertLoopSheetsPresent passes when the PNG is on disk', async () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), 'loop-sheets-'));
    try {
      mkdirSync(path.join(cwd, 'public', 'loops'), { recursive: true });
      writeFileSync(
        path.join(cwd, 'public', 'loops', 'sprite_23_demo_LOOP.png'),
        png,
      );
      const { catalog } = createTestCatalog();
      const id = parsePlayerId('30920636');
      await catalog.upsertDiscovered(fakeSeed('30920636', 'Pele', 122, 'pele'));
      await catalog.upsertPlayer(
        fakePlayer({
          id: '30920636',
          name: 'Pele',
          rating: 122,
          slug: 'pele',
          availableImageKinds: ['card', 'loop-f45'],
        }),
        [
          {
            playerId: id,
            kind: 'loop-f45',
            upstreamUrl:
              'https://images-v2.renderz.app/sprite_23_demo_LOOP?verify=1',
            fetchedAt: Date.now(),
          },
        ],
      );
      const report = await assertLoopSheetsPresent(catalog, cwd);
      expect(report.missing).toEqual([]);
      expect(report.total).toBe(1);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('assertLoopSheetsPresent throws when the PNG is missing', async () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), 'loop-sheets-miss-'));
    try {
      mkdirSync(path.join(cwd, 'public', 'loops'), { recursive: true });
      const { catalog } = createTestCatalog();
      const id = parsePlayerId('30920636');
      await catalog.upsertDiscovered(fakeSeed('30920636', 'Pele', 122, 'pele'));
      await catalog.upsertPlayer(
        fakePlayer({
          id: '30920636',
          name: 'Pele',
          rating: 122,
          slug: 'pele',
          availableImageKinds: ['card', 'loop-f45'],
        }),
        [
          {
            playerId: id,
            kind: 'loop-f45',
            upstreamUrl:
              'https://images-v2.renderz.app/sprite_23_demo_LOOP?verify=1',
            fetchedAt: Date.now(),
          },
        ],
      );
      await expect(assertLoopSheetsPresent(catalog, cwd)).rejects.toThrow(
        /Missing 1\/1 LOOP sprite/,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

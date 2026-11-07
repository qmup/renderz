import { describe, expect, it } from 'vitest';
import { summarizeLoopSheets, type LoopSheetStatus } from '@/lib/catalog/loop-sheets';

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
});

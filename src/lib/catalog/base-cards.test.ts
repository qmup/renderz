import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { baseCardTier } from '@/lib/catalog/base-cards';
import {
  baseCardSearchBody,
  cardArtFromSearchPayload,
  cardsAfterSearchBody,
  encodeRenderzSearchQuery,
  entriesFromSearchPayload,
} from '@/lib/providers/renderz/base-card-search';

describe('baseCardTier', () => {
  it('recognizes the gold and silver subtitles and frames', () => {
    expect(baseCardTier({ programName: 'FC Base Gold Player' })).toBe('gold');
    expect(baseCardTier({ programName: 'FC Base Silver Player' })).toBe('silver');
    expect(
      baseCardTier({
        programName:
          'FC Base Silver Player. Base Player Items are subject to change',
      }),
    ).toBe('silver');
    expect(baseCardTier({ artHint: 'sprite_23_base_B_BASE_SILVER' })).toBe(
      'silver',
    );
    expect(baseCardTier({ artHint: 'bg_23_B_BASE2' })).toBeNull();
    expect(baseCardTier({ bindingXml: 'PlayerCardUI_S11_Gold_Base' })).toBe('gold');
    expect(baseCardTier({ bindingXml: 'PLAYERCARDUI_BASE_GOLD_B' })).toBe('gold');
    expect(baseCardTier({ bindingXml: 'PlayerCardUI_S11_Sliver_Base' })).toBe(
      'silver',
    );
    expect(baseCardTier({ bindingXml: 'PLAYERCARDUI_BASE_SILVER_B' })).toBe(
      'silver',
    );
    expect(
      baseCardTier({
        artHint: 'https://images.example/bg_23_backgrounds_26_S11_SLIVER_BASE_STATIC',
      }),
    ).toBe('silver');
  });

  it('ignores bronze and promo cards', () => {
    expect(baseCardTier({ programName: 'FC Base Bronze Player' })).toBeNull();
    expect(baseCardTier({ bindingXml: 'PlayerCardUI_S11_Bronze_Base' })).toBeNull();
    expect(baseCardTier({ artHint: 'S11_BRONZE_BASE' })).toBeNull();
    expect(baseCardTier({ programName: 'Team of the Week' })).toBeNull();
    expect(baseCardTier({ bindingXml: 'PlayerCardUI_S11_TOTW' })).toBeNull();
  });
});

describe('base card search', () => {
  it('encodes the query the way RenderZ expects', () => {
    const body = baseCardSearchBody(0, 100);
    const encoded = encodeRenderzSearchQuery(body);
    const inflated = inflateRawSync(Buffer.from(encoded, 'base64url')).toString('utf8');
    expect(JSON.parse(inflated)).toEqual(body);
    expect(encoded).not.toMatch(/[=+/]/);
  });

  it('keeps ids and slugs and drops image payloads', () => {
    const entries = entriesFromSearchPayload({
      players: [
        {
          assetId: 19225645,
          cardName: 'De Arrascaeta',
          bindingXml: 'PlayerCardUI_S11_Gold_Base',
          images: { playerCardImage: 'https://example.invalid/secret' },
        },
      ],
    });
    expect(entries).toEqual([{ id: '19225645', slug: 'de-arrascaeta' }]);
    expect(JSON.stringify(entries)).not.toContain('http');
  });

  it('reads colors and unsigned art names for every card', () => {
    const cards = cardArtFromSearchPayload({
      players: [
        {
          assetId: 19020801,
          cardName: 'Kroos',
          animation: {
            colors: { rating: '#4E3D0E', position: '#4E3D0E', name: '#4E3D0E' },
          },
          images: {
            playerCardImage: 'https://images-v2.renderz.app/player_26_20801?verify=1-a',
            playerCardBackground:
              'https://images-v2.renderz.app/bg_23_backgrounds_26_S11_GOLD_BASE_STATIC?verify=1-b',
          },
        },
        { assetId: 24000002, cardName: 'Plain', animation: { cardData: [] } },
      ],
    });
    expect(cards).toEqual([
      {
        id: '19020801',
        slug: 'kroos',
        colors: { name: '#4E3D0E', rating: '#4E3D0E', position: '#4E3D0E' },
        background: 'bg_23_backgrounds_26_S11_GOLD_BASE_STATIC',
        card: 'player_26_20801',
        backgroundUrl:
          'https://images-v2.renderz.app/bg_23_backgrounds_26_S11_GOLD_BASE_STATIC?verify=1-b',
        cardUrl: 'https://images-v2.renderz.app/player_26_20801?verify=1-a',
      },
      {
        id: '24000002',
        slug: 'plain',
        colors: { name: '#FFFFFF', rating: '#FFFFFF', position: '#FFFFFF' },
        background: undefined,
        card: undefined,
        backgroundUrl: undefined,
        cardUrl: undefined,
      },
    ]);
  });

  it('pages the whole catalog by asset id', () => {
    expect(cardsAfterSearchBody(24000100).query.bool.must).toEqual([
      { range: { assetId: { gt: 24000100 } } },
    ]);
  });
});

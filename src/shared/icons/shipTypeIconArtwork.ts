/**
 * Hand-drawn top-down ship silhouettes in a shared 24 × 24 viewBox.
 * The bow always points up; forms are centered so map selection corners align.
 * Each type is a single filled silhouette with an outline; there are no interior marks.
 */
export interface ShipIconArtwork {
  hull: string
}

export const shipTypeIconArtwork = {
  // Small craft: a single recognizable mass.
  Shuttle: {
    hull: 'M12 2.6 17.1 10.4 16 18.3 12 21 8 18.3 6.9 10.4Z',
  },
  Scout: {
    hull: 'M12 1.9 15.3 10.4 19.5 17.1 14.2 16.1 12 21.9 9.8 16.1 4.5 17.1 8.7 10.4Z',
  },

  // Frigates: light dart-like frames, with role-specific wings and bow profiles.
  Frigate: {
    hull: 'M12 2.4 18.6 20.8 12 18.7 5.4 20.8Z',
  },
  Interceptor: {
    hull: 'M12 2 14.5 10.6 20.8 17.1 17 17.8 19.2 21.2 12 18.6 4.8 21.2 7 17.8 3.2 17.1 9.5 10.6Z',
  },
  CovertOpsFrigate: {
    hull: 'M12 2.3 16.9 9.5 20.1 18.8 14.6 16.3 12 21.4 9.4 16.3 3.9 18.8 7.1 9.5Z',
  },
  AssaultFrigate: {
    hull: 'M12 2.1 16.1 9.3 19.5 18.3 17.6 21.2 12 18.9 6.4 21.2 4.5 18.3 7.9 9.3Z',
  },
  ElectronicAttackFrigate: {
    hull: 'M12 2.7 16.2 11.3 19.3 13.2 21 19.8 16.8 18.4 12 20.4 7.2 18.4 3 19.8 4.7 13.2 7.8 11.3Z',
  },
  ExplorationFrigate: {
    hull: 'M12 2 15.2 10.2 20.3 14.5 17.5 20.6 12 17.5 6.5 20.6 3.7 14.5 8.8 10.2Z',
  },
  LogisticsFrigate: {
    hull: 'M12 2.7 16.4 10.2 18.8 17.1 20.4 20.3 14.4 19.1 12 21.1 9.6 19.1 3.6 20.3 5.2 17.1 7.6 10.2Z',
  },

  // Destroyers: extended prow, visible stern beam and lateral weapon stations.
  Destroyer: {
    hull: 'M12 2 15.6 9.4 19.5 17.6 20.3 21 3.7 21 4.5 17.6 8.4 9.4Z',
  },
  InterdictionDestroyer: {
    hull: 'M12 2 15.3 8.9 20.4 11.8 18.5 16.4 21 21 15.9 19.3 12 21 8.1 19.3 3 21 5.5 16.4 3.6 11.8 8.7 8.9Z',
  },
  TacticalDestroyer: {
    hull: 'M12 2 15 9 18.9 11.8 17.8 15.4 20.1 19.4 18.4 21.1 12 19.6 5.6 21.1 3.9 19.4 6.2 15.4 5.1 11.8 9 9Z',
  },
  CommandDestroyer: {
    hull: 'M12 2 16.1 9.5 19.7 17.3 20.4 21H3.6l.7-3.7 3.6-7.8Z',
  },

  // Cruisers: broad shoulders and substantial hulls.
  Cruiser: {
    hull: 'M12 2.4 20 9.2v11.9H4V9.2Z',
  },
  LogisticsCruiser: {
    hull: 'M12 2.8 19.2 8.5l1.6 5.2-1.6 7.4h-5.1L12 19.5l-2.1 1.6H4.8l-1.6-7.4 1.6-5.2Z',
  },
  HeavyAssaultCruiser: {
    hull: 'M12 2 20.5 8.4l1 5-1.2 7.6H4.2L3 13.4l1-5Z',
  },
  ReconCruiser: {
    hull: 'M12 2.1 17.3 8.4 20.2 14.7 17.1 20.9 12 18.3 6.9 20.9 3.8 14.7 6.7 8.4Z',
  },
  HeavyInterdictionCruiser: {
    hull: 'M12 2.5 18.8 8.5 21 12.8 18.7 15 20.4 21.2 14.6 19.2 12 21.5 9.4 19.2 3.6 21.2 5.3 15 3 12.8 5.2 8.5Z',
  },
  StrategicCruiser: {
    hull: 'M12 2 16.8 7.2 20 9.2v4l-1.5 2.3 1.5 5.5h-6.4L12 19.4l-1.6 1.6H4l1.5-5.5L4 13.2v-4l3.2-2Z',
  },
  FieldCruiser: {
    hull: 'M12 2.6 19.7 8.6v8.1l1.3 4.4H3l1.3-4.4V8.6Z',
  },

  // Battlecruisers: cruiser bows on long, winged engine frames.
  Battlecruiser: {
    hull: 'M12 2 18.3 7.6 21 11.5l-2.2 5.7 2.2 4H3l2.2-4L3 11.5l2.7-3.9Z',
  },
  CommandBattlecruiser: {
    hull: 'M12 2 18.9 7.5 21 11.6l-1.9 4.5 2 5.1H2.9l2-5.1L3 11.6l2.1-4.1Z',
  },

  // Battleships: armored arrowhead with a characteristic V-cut stern.
  Battleship: {
    hull: 'M12 2.2 20.6 9.1v12L12 15.3l-8.6 5.8v-12Z',
  },
  BlackOpsBattleship: {
    hull: 'M12 2 18.7 7.1 21.2 10.5l-1.9 4.3 1.9 6.4L12 15l-9.2 6.2 1.9-6.4-1.9-4.3 2.5-3.4Z',
  },
  Marauder: {
    hull: 'M12 2 20.4 8.4l.8 5.8-2.2 6.9L12 16.3l-7 4.8-2.2-6.9.8-5.8Z',
  },

  // Civilian hulls: cargo geometry dominates rather than a weapon prow.
  IndustrialShip: {
    hull: 'M8 3.2h8l4.4 5.7v11.8H3.6V8.9Z',
  },
  TransportShip: {
    hull: 'M9 2.8h6l2.7 4.1 2.9 1.4v12.6H3.4V8.3l2.9-1.4Z',
  },
  IndustrialCommandShip: {
    hull: 'M12 2.4 16.1 5.6 20.5 8.7v12.2H3.5V8.7l4.4-3.1Z',
  },

  // Mining craft: broad intake arms and a central processing bay.
  MiningBarge: {
    hull: 'M5.4 3.2 9 8.2h6l3.6-5 2.2 10.1-3.7 7.7H6.9l-3.7-7.7Z',
  },
  Exhumer: {
    hull: 'M4 2.8 8.3 7.7h7.4L20 2.8l1.5 11.1-4 7.1h-11l-4-7.1Z',
  },

  // Capital ships: wider structural masses; each specialist has a different silhouette.
  CapitalShip: {
    hull: 'M12 1.8 18.4 6.7 21.4 13.7 19.5 21.5H4.5l-1.9-7.8 3-7Z',
  },
  Dreadnought: {
    hull: 'M12 1.8 20.2 7.3 21.8 14.3 19.3 21.5H4.7l-2.5-7.2 1.6-7Z',
  },
  Freighter: {
    hull: 'M9 2.2h6l2.8 4.3 3 2v12.9H3.2V8.5l3-2Z',
  },
  LightCarrier: {
    hull: 'M12 1.8 17.3 6.8 20.8 10.5v10.8H3.2V10.5l3.5-3.7Z',
  },
  HeavyCarrier: {
    hull: 'M12 1.8 18.2 5.8 21.4 10v11.3H2.6V10l3.2-4.2Z',
  },
  CapitalIndustrialShip: {
    hull: 'M12 2.4 16.7 5.3 21.2 9.1v12.3H2.8V9.1l4.5-3.8Z',
  },
  ForceAuxiliary: {
    hull: 'M12 2.2 17.4 6.3 20.6 10.1l.8 11.2H2.6l.8-11.2 3.2-3.8Z',
  },
  StrategicFreighter: {
    hull: 'M12 1.9 17 5.2 20.7 9.3l-.8 5.1 1.1 6.9H3l1.1-6.9-.8-5.1L7 5.2Z',
  },
  Titan: {
    hull: 'M12 1.5 18.7 6.2 21.5 11.4 19.4 15.8 21.8 21.7H2.2l2.4-5.9-2.1-4.4 2.8-5.2Z',
  }
} as const satisfies Record<string, ShipIconArtwork>



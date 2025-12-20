const {
  isWaitingList,
  extractGender,
  extractYouthAge,
  extractDpfLevel,
  extractDpfLevels,
  extractDashLevels,
  extractConcatenatedGenderLevel,
  extractStandaloneLevels,
  normalizeClassName,
  normalizeClass,
  normalizeEventClasses,
  normalizeAllEvents,
  getStatistics,
} = require('./normalizeClasses');

describe('isWaitingList', () => {
  it('should detect Danish "venteliste"', () => {
    expect(isWaitingList('Dame DPF100 - Venteliste')).toBe(true);
    expect(isWaitingList('DPF 25 HERRER (VENTELISTE)')).toBe(true);
    expect(isWaitingList('Dame Venteliste')).toBe(true);
  });

  it('should detect English "waiting list"', () => {
    expect(isWaitingList('Waiting list - Men DPF50')).toBe(true);
    expect(isWaitingList('waitinglist for DPF25')).toBe(true);
  });

  it('should return false for non-waiting list entries', () => {
    expect(isWaitingList('Herrer DPF50 (først til mølle)')).toBe(false);
    expect(isWaitingList('Dame DPF25')).toBe(false);
    expect(isWaitingList('Mix DPF35')).toBe(false);
  });
});

describe('extractGender', () => {
  describe('Herrer (Men)', () => {
    it('should extract "Herrer" from various formats', () => {
      expect(extractGender('Herrer DPF50')).toBe('Herrer');
      expect(extractGender('herrer DPF50')).toBe('Herrer');
      expect(extractGender('HERRER DPF50')).toBe('Herrer');
      expect(extractGender('DPF50 Herrer')).toBe('Herrer');
    });

    it('should extract "Herrer" from "Herre" (singular)', () => {
      expect(extractGender('Herre DPF50')).toBe('Herrer');
      expect(extractGender('DPF50 herre')).toBe('Herrer');
      expect(extractGender('HERRE DPF25')).toBe('Herrer');
    });
  });

  describe('Damer (Women)', () => {
    it('should extract "Damer" from various formats', () => {
      expect(extractGender('Damer DPF50')).toBe('Damer');
      expect(extractGender('damer DPF50')).toBe('Damer');
      expect(extractGender('DAMER DPF50')).toBe('Damer');
    });

    it('should extract "Damer" from "Dame" (singular)', () => {
      expect(extractGender('Dame DPF50')).toBe('Damer');
      expect(extractGender('dame DPF25')).toBe('Damer');
      expect(extractGender('DAME DPF35')).toBe('Damer');
    });

    it('should normalize "Kvinder" to "Damer"', () => {
      expect(extractGender('Kvinder DPF50')).toBe('Damer');
      expect(extractGender('kvinder DPF25')).toBe('Damer');
      expect(extractGender('DPF 100 Kvinder')).toBe('Damer');
    });

    it('should normalize "Kvinde" (singular) to "Damer"', () => {
      expect(extractGender('Kvinde DPF50')).toBe('Damer');
    });
  });

  describe('Mix', () => {
    it('should extract "Mix" from various formats', () => {
      expect(extractGender('Mix DPF50')).toBe('Mix');
      expect(extractGender('MIX DPF25')).toBe('Mix');
      expect(extractGender('mix DPF35')).toBe('Mix');
      expect(extractGender('DPF 25 Mix')).toBe('Mix');
    });
  });

  describe('Youth divisions', () => {
    it('should extract "Drenge" (boys)', () => {
      expect(extractGender('Drenge U14 DPF500')).toBe('Drenge');
      expect(extractGender('drenge U16 DPF200')).toBe('Drenge');
      expect(extractGender('U12 drenge DPF500')).toBe('Drenge');
    });

    it('should extract "Piger" (girls)', () => {
      expect(extractGender('Piger U14 DPF500')).toBe('Piger');
      expect(extractGender('piger U18 DPF200')).toBe('Piger');
      expect(extractGender('U16 piger DPF500')).toBe('Piger');
    });
  });

  it('should return null when no gender found', () => {
    expect(extractGender('DPF50')).toBe(null);
    expect(extractGender('Speed tournament')).toBe(null);
    expect(extractGender('Finals')).toBe(null);
  });
});

describe('extractYouthAge', () => {
  it('should extract U12', () => {
    expect(extractYouthAge('Drenge U12 DPF500')).toBe('U12');
    expect(extractYouthAge('U12 drenge DPF500')).toBe('U12');
    expect(extractYouthAge('Piger U12 DPF200')).toBe('U12');
  });

  it('should extract U14', () => {
    expect(extractYouthAge('Drenge U14 DPF500')).toBe('U14');
    expect(extractYouthAge('U14 piger DPF500')).toBe('U14');
  });

  it('should extract U16', () => {
    expect(extractYouthAge('Drenge U16 DPF500')).toBe('U16');
    expect(extractYouthAge('U16 piger DPF500')).toBe('U16');
  });

  it('should extract U18', () => {
    expect(extractYouthAge('Drenge U18 DPF500')).toBe('U18');
    expect(extractYouthAge('U18 piger DPF500')).toBe('U18');
  });

  it('should return null for adult classes', () => {
    expect(extractYouthAge('Herrer DPF50')).toBe(null);
    expect(extractYouthAge('Damer DPF25')).toBe(null);
    expect(extractYouthAge('Mix DPF100')).toBe(null);
  });
});

describe('extractDpfLevel', () => {
  it('should extract DPF level without space', () => {
    expect(extractDpfLevel('Herrer DPF50')).toBe('DPF50');
    expect(extractDpfLevel('DPF25 Damer')).toBe('DPF25');
    expect(extractDpfLevel('Mix DPF100')).toBe('DPF100');
  });

  it('should extract DPF level with space', () => {
    expect(extractDpfLevel('Herrer DPF 50')).toBe('DPF50');
    expect(extractDpfLevel('DPF 25 Damer')).toBe('DPF25');
    expect(extractDpfLevel('Mix DPF 100')).toBe('DPF100');
  });

  it('should handle lowercase', () => {
    expect(extractDpfLevel('herrer dpf50')).toBe('DPF50');
    expect(extractDpfLevel('dpf 25 damer')).toBe('DPF25');
  });

  it('should extract various DPF levels', () => {
    expect(extractDpfLevel('DPF10')).toBe('DPF10');
    expect(extractDpfLevel('DPF35')).toBe('DPF35');
    expect(extractDpfLevel('DPF60')).toBe('DPF60');
    expect(extractDpfLevel('DPF200')).toBe('DPF200');
    expect(extractDpfLevel('DPF500')).toBe('DPF500');
    expect(extractDpfLevel('DPF1000')).toBe('DPF1000');
  });

  it('should return first level when multiple levels present', () => {
    expect(extractDpfLevel('Herrer DPF100/60')).toBe('DPF100');
    expect(extractDpfLevel('Damer DPF 25/35/50')).toBe('DPF25');
  });

  it('should fallback to standalone levels when no DPF pattern found', () => {
    expect(extractDpfLevel('HERRE 100')).toBe('DPF100');
    expect(extractDpfLevel('DAME 60')).toBe('DPF60');
  });

  it('should return null when no DPF level found', () => {
    expect(extractDpfLevel('Herrer')).toBe(null);
    expect(extractDpfLevel('Speed tournament')).toBe(null);
    expect(extractDpfLevel('Finals')).toBe(null);
  });
});

describe('extractDpfLevels', () => {
  it('should extract single DPF level as array', () => {
    expect(extractDpfLevels('Herrer DPF50')).toEqual(['DPF50']);
    expect(extractDpfLevels('Damer DPF 25')).toEqual(['DPF25']);
  });

  it('should extract multiple DPF levels from slash-separated format', () => {
    expect(extractDpfLevels('Herrer DPF100/60')).toEqual(['DPF100', 'DPF60']);
    expect(extractDpfLevels('Damer DPF 25/35/50')).toEqual(['DPF25', 'DPF35', 'DPF50']);
    expect(extractDpfLevels('DPF 200/100/60/35/25/10')).toEqual([
      'DPF200',
      'DPF100',
      'DPF60',
      'DPF35',
      'DPF25',
      'DPF10',
    ]);
  });

  it('should handle complex class names with multiple levels', () => {
    expect(extractDpfLevels('Herrer DPF 25/35/50/100/200 - Formiddag')).toEqual([
      'DPF25',
      'DPF35',
      'DPF50',
      'DPF100',
      'DPF200',
    ]);
    expect(extractDpfLevels('TILMELDING HERRE DPF 100/60')).toEqual(['DPF100', 'DPF60']);
  });

  it('should return empty array when no DPF level found', () => {
    expect(extractDpfLevels('Herrer')).toEqual([]);
    expect(extractDpfLevels('Speed tournament')).toEqual([]);
  });
});

describe('extractStandaloneLevels', () => {
  it('should extract standalone level numbers without DPF prefix', () => {
    expect(extractStandaloneLevels('HERRE 100')).toEqual(['DPF100']);
    expect(extractStandaloneLevels('DAME 60')).toEqual(['DPF60']);
  });

  it('should return empty array when DPF levels are present', () => {
    expect(extractStandaloneLevels('Herrer DPF50')).toEqual([]);
    expect(extractStandaloneLevels('DPF 100/60 Herrer')).toEqual([]);
  });

  it('should return empty array when multiple standalone numbers present', () => {
    // Multiple numbers might be dates or other things
    expect(extractStandaloneLevels('HERRE 100 60')).toEqual([]);
  });

  it('should return empty array when no recognized level found', () => {
    expect(extractStandaloneLevels('Herrer')).toEqual([]);
    expect(extractStandaloneLevels('Speed tournament 5')).toEqual([]);
  });
});

describe('extractDashLevels', () => {
  it('should extract dash-separated levels from parentheses', () => {
    expect(extractDashLevels('herrer (200-100)')).toEqual(['DPF200', 'DPF100']);
    expect(extractDashLevels('Tilmelding, herrer (200-100)')).toEqual(['DPF200', 'DPF100']);
  });

  it('should handle multiple levels', () => {
    expect(extractDashLevels('(100-60-35)')).toEqual(['DPF100', 'DPF60', 'DPF35']);
  });

  it('should return empty array when no parenthesized levels found', () => {
    expect(extractDashLevels('Herrer DPF50')).toEqual([]);
    expect(extractDashLevels('HERRE 100')).toEqual([]);
  });

  it('should only extract valid DPF level numbers', () => {
    expect(extractDashLevels('(100-60)')).toEqual(['DPF100', 'DPF60']);
    expect(extractDashLevels('(99-88)')).toEqual([]); // Invalid levels
  });
});

describe('extractConcatenatedGenderLevel', () => {
  it('should extract Herre + level combinations', () => {
    expect(extractConcatenatedGenderLevel('Herre50 FTM')).toEqual({
      gender: 'Herrer',
      levels: ['DPF50'],
    });
    expect(extractConcatenatedGenderLevel('Herre35 FTM')).toEqual({
      gender: 'Herrer',
      levels: ['DPF35'],
    });
    expect(extractConcatenatedGenderLevel('Herre100')).toEqual({
      gender: 'Herrer',
      levels: ['DPF100'],
    });
  });

  it('should extract Dame + level combinations', () => {
    expect(extractConcatenatedGenderLevel('Dame50 FTM')).toEqual({
      gender: 'Damer',
      levels: ['DPF50'],
    });
    expect(extractConcatenatedGenderLevel('Dame35 FTM')).toEqual({
      gender: 'Damer',
      levels: ['DPF35'],
    });
  });

  it('should return null when no concatenated pattern found', () => {
    expect(extractConcatenatedGenderLevel('Herrer DPF50')).toEqual(null);
    expect(extractConcatenatedGenderLevel('HERRE 100')).toEqual(null);
    expect(extractConcatenatedGenderLevel('Speed tournament')).toEqual(null);
  });

  it('should only accept valid DPF level numbers', () => {
    expect(extractConcatenatedGenderLevel('Herre50')).toEqual({
      gender: 'Herrer',
      levels: ['DPF50'],
    });
    expect(extractConcatenatedGenderLevel('Herre99')).toEqual(null); // 99 is not a valid DPF level
  });
});

describe('normalizeClassName', () => {
  it('should normalize complete class names', () => {
    const result = normalizeClassName('Herrer DPF50 (først til mølle)');
    expect(result.isWaitingList).toBe(false);
    expect(result.series).toEqual([{ name: 'Herrer DPF50', ranking: 'DPF50', category: 'Herrer' }]);
  });

  it('should normalize with various formats', () => {
    expect(normalizeClassName('Dame DPF 25 FTM').series[0].name).toBe('Damer DPF25');
    expect(normalizeClassName('FØRST TIL MØLLE HERRE DPF 50').series[0].name).toBe('Herrer DPF50');
    expect(normalizeClassName('Mix DPF100 (ranglistestyret)').series[0].name).toBe('Mix DPF100');
    expect(normalizeClassName('Kvinder DPF35').series[0].name).toBe('Damer DPF35');
  });

  it('should return empty series for waiting list', () => {
    const result = normalizeClassName('Dame DPF100 - Venteliste');
    expect(result.isWaitingList).toBe(true);
    expect(result.series).toEqual([]);
  });

  it('should return empty series when gender and DPF both missing', () => {
    expect(normalizeClassName('Herrer').series).toEqual([]); // Gender but no level
    expect(normalizeClassName('Speed tournament').series).toEqual([]); // No gender, no level
  });

  it('should default to Herrer when DPF present but no gender', () => {
    // DPF50 without gender should default to Herrer
    expect(normalizeClassName('DPF50').series).toEqual([
      { name: 'Herrer DPF50', ranking: 'DPF50', category: 'Herrer' },
    ]);
  });

  describe('youth divisions', () => {
    it('should normalize youth class names with gender field including age', () => {
      const result = normalizeClassName('Drenge U14 DPF500');
      expect(result.series).toEqual([
        { name: 'Drenge U14 DPF500', ranking: 'DPF500', category: 'Drenge U14' },
      ]);
    });

    it('should handle different youth age formats', () => {
      expect(normalizeClassName('U12 drenge DPF500').series[0]).toEqual({
        name: 'Drenge U12 DPF500',
        ranking: 'DPF500',
        category: 'Drenge U12',
      });
      expect(normalizeClassName('Piger U16 DPF200').series[0]).toEqual({
        name: 'Piger U16 DPF200',
        ranking: 'DPF200',
        category: 'Piger U16',
      });
      expect(normalizeClassName('U18 piger DPF500').series[0]).toEqual({
        name: 'Piger U18 DPF500',
        ranking: 'DPF500',
        category: 'Piger U18',
      });
    });
  });

  describe('multiple DPF levels', () => {
    it('should create multiple series entries for multiple levels', () => {
      const result = normalizeClassName('Herrer DPF100/60');
      expect(result.series).toEqual([
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
        { name: 'Herrer DPF60', ranking: 'DPF60', category: 'Herrer' },
      ]);
    });

    it('should handle three or more levels', () => {
      const result = normalizeClassName('Damer DPF 25/35/50');
      expect(result.series).toEqual([
        { name: 'Damer DPF25', ranking: 'DPF25', category: 'Damer' },
        { name: 'Damer DPF35', ranking: 'DPF35', category: 'Damer' },
        { name: 'Damer DPF50', ranking: 'DPF50', category: 'Damer' },
      ]);
    });

    it('should handle complex multi-level class names', () => {
      const result = normalizeClassName('Herrer DPF 25/35/50/100/200 - Formiddag');
      expect(result.series).toHaveLength(5);
      expect(result.series[0]).toEqual({
        name: 'Herrer DPF25',
        ranking: 'DPF25',
        category: 'Herrer',
      });
      expect(result.series[4]).toEqual({
        name: 'Herrer DPF200',
        ranking: 'DPF200',
        category: 'Herrer',
      });
    });
  });

  describe('standalone levels without DPF prefix', () => {
    it('should normalize class names without DPF prefix', () => {
      const result = normalizeClassName('HERRE 100');
      expect(result.series).toEqual([
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
      ]);
    });

    it('should normalize DAME without DPF prefix', () => {
      const result = normalizeClassName('DAME 60');
      expect(result.series).toEqual([{ name: 'Damer DPF60', ranking: 'DPF60', category: 'Damer' }]);
    });
  });

  describe('concatenated gender+level patterns', () => {
    it('should normalize Herre50 format', () => {
      const result = normalizeClassName('Herre50 FTM');
      expect(result.series).toEqual([
        { name: 'Herrer DPF50', ranking: 'DPF50', category: 'Herrer' },
      ]);
    });

    it('should normalize Dame35 format', () => {
      const result = normalizeClassName('Dame35 FTM');
      expect(result.series).toEqual([{ name: 'Damer DPF35', ranking: 'DPF35', category: 'Damer' }]);
    });

    it('should handle various concatenated patterns', () => {
      expect(normalizeClassName('Herre100').series[0].name).toBe('Herrer DPF100');
      expect(normalizeClassName('Dame50').series[0].name).toBe('Damer DPF50');
      expect(normalizeClassName('Herrer60').series[0].name).toBe('Herrer DPF60');
    });
  });

  describe('dash-separated levels', () => {
    it('should normalize dash-separated levels in parentheses', () => {
      const result = normalizeClassName('Tilmelding, herrer (200-100)');
      expect(result.series).toEqual([
        { name: 'Herrer DPF200', ranking: 'DPF200', category: 'Herrer' },
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
      ]);
    });

    it('should normalize dash-separated DPF levels', () => {
      const result = normalizeClassName('Herrer DPF100-60');
      expect(result.series).toEqual([
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
        { name: 'Herrer DPF60', ranking: 'DPF60', category: 'Herrer' },
      ]);
    });
  });

  describe('default gender to Herrer', () => {
    it('should default to Herrer when DPF level present but no gender', () => {
      const result = normalizeClassName('DPF 50 Først-til-mølle - Fredag');
      expect(result.series).toEqual([
        { name: 'Herrer DPF50', ranking: 'DPF50', category: 'Herrer' },
      ]);
    });

    it('should default to Herrer for multiple levels without gender', () => {
      const result = normalizeClassName('DPF 35/25 Først-til-mølle');
      expect(result.series).toEqual([
        { name: 'Herrer DPF35', ranking: 'DPF35', category: 'Herrer' },
        { name: 'Herrer DPF25', ranking: 'DPF25', category: 'Herrer' },
      ]);
    });

    it('should default to Herrer for concatenated DPF patterns', () => {
      const result = normalizeClassName('DPF25A');
      expect(result.series).toEqual([
        { name: 'Herrer DPF25', ranking: 'DPF25', category: 'Herrer' },
      ]);
    });
  });
});

describe('normalizeClass', () => {
  it('should return class with id and name only, plus series', () => {
    const result = normalizeClass({ id: 123, name: 'Herrer DPF50' });
    expect(result.class).toEqual({ id: 123, name: 'Herrer DPF50' });
    expect(result.series).toEqual([
      { name: 'Herrer DPF50', ranking: 'DPF50', category: 'Herrer', playerCount: null },
    ]);
    expect(result.isUnknown).toBe(false);
  });

  it('should return null class for waiting list entries', () => {
    const result = normalizeClass({ id: 789, name: 'Dame DPF100 - Venteliste' });
    expect(result.class).toBe(null);
    expect(result.series).toEqual([]);
    expect(result.isUnknown).toBe(false);
  });

  it('should mark as unknown when cannot normalize', () => {
    const result = normalizeClass({ id: 999, name: 'Finals' });
    expect(result.class).toEqual({ id: 999, name: 'Finals' });
    expect(result.series).toEqual([]);
    expect(result.isUnknown).toBe(true);
  });

  it('should include multiple series for multi-level classes', () => {
    const result = normalizeClass({ id: 123, name: 'Herrer DPF100/60' });
    expect(result.series).toEqual([
      { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer', playerCount: null },
      { name: 'Herrer DPF60', ranking: 'DPF60', category: 'Herrer', playerCount: null },
    ]);
  });

  it('should handle youth classes', () => {
    const result = normalizeClass({ id: 123, name: 'Drenge U14 DPF500' });
    expect(result.series).toEqual([
      { name: 'Drenge U14 DPF500', ranking: 'DPF500', category: 'Drenge U14', playerCount: null },
    ]);
  });

  it('should handle standalone level numbers', () => {
    const result = normalizeClass({ id: 123, name: 'HERRE 100' });
    expect(result.series).toEqual([
      { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer', playerCount: null },
    ]);
  });
});

describe('normalizeEventClasses', () => {
  it('should aggregate series at event level', () => {
    const event = {
      eventId: 1,
      eventName: 'Test Tournament',
      classes: [
        { id: 1, name: 'Herrer DPF50' },
        { id: 2, name: 'Dame DPF 25' },
        { id: 3, name: 'Mix DPF35' },
      ],
    };

    const result = normalizeEventClasses(event);

    expect(result.classes).toEqual([
      { id: 1, name: 'Herrer DPF50' },
      { id: 2, name: 'Dame DPF 25' },
      { id: 3, name: 'Mix DPF35' },
    ]);
    expect(result.series).toHaveLength(3);
    expect(result.series).toContainEqual({
      name: 'Herrer DPF50',
      ranking: 'DPF50',
      category: 'Herrer',
      playerCount: null,
    });
    expect(result.series).toContainEqual({
      name: 'Damer DPF25',
      ranking: 'DPF25',
      category: 'Damer',
      playerCount: null,
    });
    expect(result.series).toContainEqual({
      name: 'Mix DPF35',
      ranking: 'DPF35',
      category: 'Mix',
      playerCount: null,
    });
    expect(result.unknownSeries).toEqual([]);
  });

  it('should filter out waiting list entries entirely', () => {
    const event = {
      eventId: 1,
      classes: [
        { id: 1, name: 'Herrer DPF50' },
        { id: 2, name: 'Herrer DPF50 - Venteliste' },
        { id: 3, name: 'Dame DPF25' },
      ],
    };

    const result = normalizeEventClasses(event);

    expect(result.classes).toHaveLength(2);
    expect(result.classes.find((c) => c.name.includes('Venteliste'))).toBeUndefined();
    expect(result.series).toHaveLength(2);
  });

  it('should deduplicate series by name', () => {
    const event = {
      eventId: 1,
      classes: [
        { id: 1, name: 'Herrer DPF50' },
        { id: 2, name: 'HERRER DPF 50 - FTM' },
        { id: 3, name: 'Herrer DPF50 (ranglistestyret)' },
      ],
    };

    const result = normalizeEventClasses(event);

    expect(result.classes).toHaveLength(3);
    expect(result.series).toHaveLength(1);
    expect(result.series[0]).toEqual({
      name: 'Herrer DPF50',
      ranking: 'DPF50',
      category: 'Herrer',
      playerCount: null,
    });
  });

  it('should add unnormalizable classes to unknownSeries', () => {
    const event = {
      eventId: 1,
      classes: [
        { id: 1, name: 'Herrer DPF50' },
        { id: 2, name: 'Finals' },
        { id: 3, name: 'Speed tournament' },
      ],
    };

    const result = normalizeEventClasses(event);

    expect(result.classes).toHaveLength(3);
    expect(result.series).toHaveLength(1);
    expect(result.unknownSeries).toEqual(['Finals', 'Speed tournament']);
  });

  it('should handle events without classes', () => {
    const event = { eventId: 1, eventName: 'No Classes' };
    const result = normalizeEventClasses(event);
    expect(result.classes).toEqual([]);
    expect(result.series).toEqual([]);
    expect(result.unknownSeries).toEqual([]);
  });

  it('should preserve other event properties', () => {
    const event = {
      eventId: 1,
      eventName: 'Test',
      city: 'Copenhagen',
      classes: [{ id: 1, name: 'Herrer DPF50' }],
    };

    const result = normalizeEventClasses(event);

    expect(result.eventId).toBe(1);
    expect(result.eventName).toBe('Test');
    expect(result.city).toBe('Copenhagen');
  });

  it('should expand multi-level classes into multiple series entries', () => {
    const event = {
      eventId: 1,
      classes: [{ id: 1, name: 'Herrer DPF100/60' }],
    };

    const result = normalizeEventClasses(event);

    expect(result.classes).toHaveLength(1);
    expect(result.series).toHaveLength(2);
    expect(result.series).toContainEqual({
      name: 'Herrer DPF100',
      ranking: 'DPF100',
      category: 'Herrer',
      playerCount: null,
    });
    expect(result.series).toContainEqual({
      name: 'Herrer DPF60',
      ranking: 'DPF60',
      category: 'Herrer',
      playerCount: null,
    });
  });
});

describe('normalizeAllEvents', () => {
  it('should normalize classes in all events', () => {
    const events = [
      { eventId: 1, classes: [{ id: 1, name: 'Herrer DPF50' }] },
      { eventId: 2, classes: [{ id: 2, name: 'Damer DPF25' }] },
    ];

    const result = normalizeAllEvents(events);

    expect(result).toHaveLength(2);
    expect(result[0].series[0].name).toBe('Herrer DPF50');
    expect(result[1].series[0].name).toBe('Damer DPF25');
  });
});

describe('getStatistics', () => {
  it('should compute correct statistics', () => {
    const events = [
      {
        eventId: 1,
        classes: [
          { id: 1, name: 'Herrer DPF50' },
          { id: 2, name: 'Damer DPF25' },
        ],
        series: [
          { name: 'Herrer DPF50', ranking: 'DPF50', category: 'Herrer' },
          { name: 'Damer DPF25', ranking: 'DPF25', category: 'Damer' },
        ],
        unknownSeries: [],
      },
      {
        eventId: 2,
        classes: [
          { id: 3, name: 'Herrer DPF50' },
          { id: 4, name: 'Finals' },
        ],
        series: [{ name: 'Herrer DPF50', ranking: 'DPF50', category: 'Herrer' }],
        unknownSeries: ['Finals'],
      },
    ];

    const stats = getStatistics(events);

    expect(stats.totalEvents).toBe(2);
    expect(stats.totalClasses).toBe(4);
    expect(stats.totalSeries).toBe(3);
    expect(stats.totalUnknownSeries).toBe(1);
    expect(stats.byCategory).toEqual({ Herrer: 2, Damer: 1 });
    expect(stats.byRanking).toEqual({ DPF50: 2, DPF25: 1 });
    expect(stats.bySeriesName).toEqual({ 'Herrer DPF50': 2, 'Damer DPF25': 1 });
    expect(stats.unknownSeriesNames).toContain('Finals');
  });
});

describe('Real-world class name examples', () => {
  const testCases = [
    // Standard formats
    { input: 'Herrer DPF50', expectedName: 'Herrer DPF50' },
    { input: 'Damer DPF25', expectedName: 'Damer DPF25' },
    { input: 'Mix DPF35', expectedName: 'Mix DPF35' },

    // With FTM (Først til mølle)
    { input: 'Herrer DPF50 (først til mølle)', expectedName: 'Herrer DPF50' },
    { input: 'Dame DPF35 FTM tilmelding', expectedName: 'Damer DPF35' },
    { input: 'FØRST TIL MØLLE HERRE DPF 25', expectedName: 'Herrer DPF25' },

    // Kvinder → Damer
    { input: 'Kvinder DPF50', expectedName: 'Damer DPF50' },
    { input: 'DPF 100 Kvinder', expectedName: 'Damer DPF100' },

    // Space in DPF
    { input: 'DPF 50 Herrer', expectedName: 'Herrer DPF50' },
    { input: 'Dame DPF 25', expectedName: 'Damer DPF25' },

    // Various cases
    { input: 'HERRER DPF100', expectedName: 'Herrer DPF100' },
    { input: 'dame dpf35', expectedName: 'Damer DPF35' },
    { input: 'MIX DPF 25 Først-til-mølle - Lørdag', expectedName: 'Mix DPF25' },

    // Complex names
    { input: 'DPF50 HERRER-BLÅ (FTM - max 750 point)', expectedName: 'Herrer DPF50' },
    { input: 'Mix DPF100 (ranglistestyret)', expectedName: 'Mix DPF100' },

    // Youth divisions
    { input: 'Drenge U12 DPF500', expectedName: 'Drenge U12 DPF500' },
    { input: 'Piger U14 DPF200', expectedName: 'Piger U14 DPF200' },
    { input: 'U16 drenge DPF500 - Lørdag', expectedName: 'Drenge U16 DPF500' },
    { input: 'U18 piger DPF500', expectedName: 'Piger U18 DPF500' },
    { input: 'Drenge U14 DPF200 (ranglistestyret tilmelding)', expectedName: 'Drenge U14 DPF200' },

    // Standalone levels without DPF prefix
    { input: 'HERRE 100', expectedName: 'Herrer DPF100' },
    { input: 'HERRE 60', expectedName: 'Herrer DPF60' },
    { input: 'DAME 100', expectedName: 'Damer DPF100' },
    { input: 'DAME 60', expectedName: 'Damer DPF60' },

    // Concatenated gender+level (no space)
    { input: 'Herre50 FTM', expectedName: 'Herrer DPF50' },
    { input: 'Dame35 FTM', expectedName: 'Damer DPF35' },
    { input: 'Herre100', expectedName: 'Herrer DPF100' },
    { input: 'Dame50', expectedName: 'Damer DPF50' },

    // Dash-separated levels in parentheses
    { input: 'Tilmelding, herrer (200-100)', expectedName: 'Herrer DPF200' },
    { input: 'herrer (100-60)', expectedName: 'Herrer DPF100' },

    // Default to Herrer when gender missing but level present
    { input: 'DPF 50 Først-til-mølle - Fredag', expectedName: 'Herrer DPF50' },
    { input: 'DPF 35 Først-til-mølle', expectedName: 'Herrer DPF35' },
    { input: 'DPF25A', expectedName: 'Herrer DPF25' },
  ];

  testCases.forEach(({ input, expectedName }) => {
    it(`should normalize "${input}" to "${expectedName}"`, () => {
      const result = normalizeClassName(input);
      expect(result.series[0]?.name).toBe(expectedName);
    });
  });
});

describe('Multiple DPF levels - series generation', () => {
  const testCases = [
    {
      input: 'Herrer DPF100/60',
      expectedSeries: [
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
        { name: 'Herrer DPF60', ranking: 'DPF60', category: 'Herrer' },
      ],
    },
    {
      input: 'Damer DPF 25/35/50',
      expectedSeries: [
        { name: 'Damer DPF25', ranking: 'DPF25', category: 'Damer' },
        { name: 'Damer DPF35', ranking: 'DPF35', category: 'Damer' },
        { name: 'Damer DPF50', ranking: 'DPF50', category: 'Damer' },
      ],
    },
    {
      input: 'Mix DPF35/25 (først til mølle)',
      expectedSeries: [
        { name: 'Mix DPF35', ranking: 'DPF35', category: 'Mix' },
        { name: 'Mix DPF25', ranking: 'DPF25', category: 'Mix' },
      ],
    },
    {
      input: 'TILMELDING HERRE DPF 100/60',
      expectedSeries: [
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
        { name: 'Herrer DPF60', ranking: 'DPF60', category: 'Herrer' },
      ],
    },
    {
      input: 'DPF 100/60/35/25 Herrer',
      expectedSeries: [
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
        { name: 'Herrer DPF60', ranking: 'DPF60', category: 'Herrer' },
        { name: 'Herrer DPF35', ranking: 'DPF35', category: 'Herrer' },
        { name: 'Herrer DPF25', ranking: 'DPF25', category: 'Herrer' },
      ],
    },
    // Dash-separated levels in DPF pattern
    {
      input: 'Herrer DPF100-60',
      expectedSeries: [
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
        { name: 'Herrer DPF60', ranking: 'DPF60', category: 'Herrer' },
      ],
    },
    // Dash-separated levels in parentheses
    {
      input: 'Tilmelding, herrer (200-100)',
      expectedSeries: [
        { name: 'Herrer DPF200', ranking: 'DPF200', category: 'Herrer' },
        { name: 'Herrer DPF100', ranking: 'DPF100', category: 'Herrer' },
      ],
    },
    // Default to Herrer when no gender
    {
      input: 'DPF 50/35 Først-til-mølle',
      expectedSeries: [
        { name: 'Herrer DPF50', ranking: 'DPF50', category: 'Herrer' },
        { name: 'Herrer DPF35', ranking: 'DPF35', category: 'Herrer' },
      ],
    },
  ];

  testCases.forEach(({ input, expectedSeries }) => {
    it(`should generate correct series for "${input}"`, () => {
      const result = normalizeClassName(input);
      expect(result.series).toEqual(expectedSeries);
    });
  });
});

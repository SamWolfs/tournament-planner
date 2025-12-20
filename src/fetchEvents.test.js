const {
  CONFIG,
  sleep,
  buildUrl,
  buildEventInfoUrl,
  fetchPage,
  fetchAllEvents,
  fetchEventClasses,
  enrichEventsWithClasses,
} = require('./fetchEvents');

// Mock console.log to reduce test noise
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CONFIG', () => {
  it('should have correct static configuration', () => {
    expect(CONFIG.organisationId).toBe(1420);
    expect(CONFIG.isFinished).toBe(false);
    expect(CONFIG.language).toBe('en');
    expect(CONFIG.pageSize).toBe(50);
    expect(CONFIG.rateLimitDelayMs).toBe(500);
  });
});

describe('sleep', () => {
  it('should resolve after specified time', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small tolerance
  });
});

describe('buildUrl', () => {
  it('should build correct URL with pagination parameters', () => {
    const url = buildUrl(0, 50);
    expect(url).toContain('organisationId=1420');
    expect(url).toContain('IsFinished=false');
    expect(url).toContain('Language=en');
    expect(url).toContain('skip=0');
    expect(url).toContain('take=50');
  });

  it('should handle different skip and take values', () => {
    const url = buildUrl(100, 25);
    expect(url).toContain('skip=100');
    expect(url).toContain('take=25');
  });
});

describe('fetchPage', () => {
  const mockEvent = {
    type: 4,
    eventId: 45899,
    eventName: 'Test Tournament',
    eventUrl: '/en/tournament/45899/test',
    club: 'Test Club',
    city: 'Copenhagen',
    isPremium: true,
    startDate: '2025-12-19T17:00:00',
    endDate: '2025-12-19T23:55:00',
    eventState: 7,
    joinUrl: '/en/tournament/45899/test',
  };

  it('should fetch and parse a page of events', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        payload: [mockEvent],
        totalCount: 1,
      }),
    };
    const mockFetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await fetchPage(0, 50, mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('skip=0'));
    expect(result.payload).toHaveLength(1);
    expect(result.payload[0]).toEqual(mockEvent);
    expect(result.totalCount).toBe(1);
  });

  it('should throw error on non-ok response', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
    };
    const mockFetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(fetchPage(0, 50, mockFetch)).rejects.toThrow('HTTP error! status: 500');
  });

  it('should throw error on network failure', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchPage(0, 50, mockFetch)).rejects.toThrow('Network error');
  });
});

describe('fetchAllEvents', () => {
  const createMockEvents = (count, startId = 1) => {
    return Array.from({ length: count }, (_, i) => ({
      type: 4,
      eventId: startId + i,
      eventName: `Tournament ${startId + i}`,
      eventUrl: `/en/tournament/${startId + i}/test`,
      club: 'Test Club',
      city: 'Copenhagen',
      isPremium: true,
      startDate: '2025-12-19T17:00:00',
      endDate: '2025-12-19T23:55:00',
      eventState: 7,
      joinUrl: `/en/tournament/${startId + i}/test`,
    }));
  };

  it('should fetch all events in a single page', async () => {
    const mockEvents = createMockEvents(10);
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        payload: mockEvents,
        totalCount: 10,
      }),
    });

    const result = await fetchAllEvents(mockFetch, 0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.events).toHaveLength(10);
    expect(result.totalCount).toBe(10);
    expect(result.fetchedAt).toBeDefined();
  });

  it('should paginate through multiple pages', async () => {
    const totalCount = 120;

    const mockFetch = jest.fn().mockImplementation((url) => {
      const urlParams = new URL(url).searchParams;
      const skip = parseInt(urlParams.get('skip'));
      const take = parseInt(urlParams.get('take'));

      const remaining = totalCount - skip;
      const returnCount = Math.min(remaining, take);
      const events = createMockEvents(returnCount, skip + 1);

      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({
          payload: events,
          totalCount: totalCount,
        }),
      });
    });

    const result = await fetchAllEvents(mockFetch, 0);

    // With pageSize 50 and 120 total, we need 3 requests (50 + 50 + 20)
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.events).toHaveLength(120);
    expect(result.totalCount).toBe(120);
  });

  it('should handle empty response', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        payload: [],
        totalCount: 0,
      }),
    });

    const result = await fetchAllEvents(mockFetch, 0);

    expect(result.events).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it('should respect rate limiting delay', async () => {
    const mockEvents = createMockEvents(50);
    let callCount = 0;

    const mockFetch = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({
          payload: callCount <= 2 ? mockEvents : [],
          totalCount: 100,
        }),
      });
    });

    const delayMs = 50;
    const start = Date.now();
    await fetchAllEvents(mockFetch, delayMs);
    const elapsed = Date.now() - start;

    // Should have at least one delay between the two requests
    expect(elapsed).toBeGreaterThanOrEqual(delayMs - 10);
  });

  it('should include ISO timestamp in result', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        payload: [],
        totalCount: 0,
      }),
    });

    const result = await fetchAllEvents(mockFetch, 0);

    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('buildEventInfoUrl', () => {
  it('should build correct URL with event ID', () => {
    const url = buildEventInfoUrl(53693);
    expect(url).toContain('id=53693');
    expect(url).toContain('language=en');
    expect(url).toContain('GetInfoAsync');
  });

  it('should handle different event IDs', () => {
    const url = buildEventInfoUrl(12345);
    expect(url).toContain('id=12345');
  });
});

describe('fetchEventClasses', () => {
  const mockEventInfoResponse = {
    TournamentSidebarModel: {
      Classes: [
        { Id: 125238, Name: 'HERRE DPF 50', MatchType: 0, IsAlreadyJoined: false },
        { Id: 125239, Name: 'HERRE DPF 25', MatchType: 0, IsAlreadyJoined: false },
      ],
    },
  };

  it('should fetch and extract classes with only id and name', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(mockEventInfoResponse),
    };
    const mockFetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await fetchEventClasses(53693, mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('id=53693'));
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 125238, name: 'HERRE DPF 50' });
    expect(result[1]).toEqual({ id: 125239, name: 'HERRE DPF 25' });
    // Should not include other fields
    expect(result[0].MatchType).toBeUndefined();
    expect(result[0].IsAlreadyJoined).toBeUndefined();
  });

  it('should return empty array when no classes exist', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        TournamentSidebarModel: {},
      }),
    };
    const mockFetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await fetchEventClasses(12345, mockFetch);

    expect(result).toEqual([]);
  });

  it('should handle missing TournamentSidebarModel', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    };
    const mockFetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await fetchEventClasses(12345, mockFetch);

    expect(result).toEqual([]);
  });

  it('should throw error on non-ok response', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
    };
    const mockFetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(fetchEventClasses(99999, mockFetch)).rejects.toThrow(
      'HTTP error! status: 404 for event 99999'
    );
  });
});

describe('enrichEventsWithClasses', () => {
  const mockEvents = [
    { eventId: 1, eventName: 'Tournament 1' },
    { eventId: 2, eventName: 'Tournament 2' },
  ];

  const createMockFetchForEnrich = (classesMap) => {
    return jest.fn().mockImplementation((url) => {
      const urlParams = new URL(url).searchParams;
      const eventId = parseInt(urlParams.get('id'));
      const classes = classesMap[eventId] || [];

      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({
          TournamentSidebarModel: {
            Classes: classes.map((c) => ({ Id: c.id, Name: c.name, MatchType: 0 })),
          },
        }),
      });
    });
  };

  it('should enrich events with classes', async () => {
    const classesMap = {
      1: [{ id: 100, name: 'Class A' }],
      2: [
        { id: 200, name: 'Class B' },
        { id: 201, name: 'Class C' },
      ],
    };
    const mockFetch = createMockFetchForEnrich(classesMap);

    const result = await enrichEventsWithClasses(mockEvents, mockFetch, 0);

    expect(result).toHaveLength(2);
    expect(result[0].eventId).toBe(1);
    expect(result[0].classes).toEqual([{ id: 100, name: 'Class A' }]);
    expect(result[1].eventId).toBe(2);
    expect(result[1].classes).toEqual([
      { id: 200, name: 'Class B' },
      { id: 201, name: 'Class C' },
    ]);
  });

  it('should preserve original event properties', async () => {
    const mockFetch = createMockFetchForEnrich({ 1: [], 2: [] });

    const result = await enrichEventsWithClasses(mockEvents, mockFetch, 0);

    expect(result[0].eventName).toBe('Tournament 1');
    expect(result[1].eventName).toBe('Tournament 2');
  });

  it('should handle errors gracefully and continue', async () => {
    let callCount = 0;
    const mockFetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({
          TournamentSidebarModel: {
            Classes: [{ Id: 200, Name: 'Class B' }],
          },
        }),
      });
    });

    const result = await enrichEventsWithClasses(mockEvents, mockFetch, 0);

    expect(result).toHaveLength(2);
    expect(result[0].classes).toEqual([]);
    expect(result[0].classesError).toBeDefined();
    expect(result[1].classes).toEqual([{ id: 200, name: 'Class B' }]);
    expect(result[1].classesError).toBeUndefined();
  });

  it('should respect rate limiting between requests', async () => {
    const mockFetch = createMockFetchForEnrich({ 1: [], 2: [] });
    const delayMs = 50;

    const start = Date.now();
    await enrichEventsWithClasses(mockEvents, mockFetch, delayMs);
    const elapsed = Date.now() - start;

    // Should have delay between the two requests
    expect(elapsed).toBeGreaterThanOrEqual(delayMs - 10);
  });

  it('should handle empty events array', async () => {
    const mockFetch = jest.fn();

    const result = await enrichEventsWithClasses([], mockFetch, 0);

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

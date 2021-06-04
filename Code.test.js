const Code = require('./Code');

const PRECISION_8DIGITS = 8;

describe('TC_ERROR', () => {
  it('rejects invalid timecode standards', () => {
    expect(Code.TC_ERROR('01:02:03:04', 24, 'non-drop'))
        .toContain('frameRate must be a single plain text value');
    expect(Code.TC_ERROR('01:02:03:04', '24', 'non-drop'))
        .toContain('frameRate must contain 2 or 3 digits after period');
    expect(Code.TC_ERROR('01:02:03:04', '12.00', 'non-drop'))
        .toContain('Unsupported frame rate: "12.00"');
    expect(Code.TC_ERROR('01:02:03:04', '96.000', 'non-drop'))
        .toContain('Unsupported frame rate: "96.000"');
    
    expect(Code.TC_ERROR('01:02:03:04', '25.000', true))
        .toContain('dropType must be a single plain text value');
    expect(Code.TC_ERROR('01:02:03:04', '25.000', 'd'))
        .toContain('dropType value must be "non-drop" or "drop"');
    expect(Code.TC_ERROR('01:02:03:04', '25.000', 'nondrop'))
        .toContain('dropType value must be "non-drop" or "drop"');
    
    expect(Code.TC_ERROR('01:02:03:04', '23.976', 'drop'))
        .toContain('frameRate 23.976 must be non-drop');
  });

  it('accepts valid timecode standards', () => {
    expect(Code.TC_ERROR('01:02:03:04', '  24.00   ', 'non-drop')).toBe('');
    expect(Code.TC_ERROR('01:02:03:04', '60.000', 'NoN-DRop')).toBe('');
    expect(Code.TC_ERROR('01:02:03:04', '29.97', 'drop')).toBe('');
    expect(Code.TC_ERROR('01:02:03:04', '59.940', '  drOP  ')).toBe('');
    expect(Code.TC_ERROR('01:02:03:04', '48.000')).toBe('');  // Defaults to non-drop.
  });

  it('rejects invalid format timecode', () => {
    expect(Code.TC_ERROR(11223344, '60.00', 'non-drop'))
        .toContain('timecode must be a single plain text value');

    expect(Code.TC_ERROR('01020304', '24.00', 'non-drop'))
        .toContain('timecode must be in HH:MM:SS:FF format: "01020304"');
    expect(Code.TC_ERROR('1:2:3:4', '24.00', 'non-drop'))
        .toContain('timecode must be in HH:MM:SS:FF format: "1:2:3:4"');
    
    expect(Code.TC_ERROR('00:00:00;00', '29.97'))  // Defaults to non-drop.
        .toContain('only drop timecode may use semi-colon separator: "00:00:00;00"');
    expect(Code.TC_ERROR('01;02;03;04', '59.940', 'non-drop'))
        .toContain('only drop timecode may use semi-colon separator: "01;02;03;04"');
  });

  it('rejects out of range MM, SS, and FF values', () => {
    expect(Code.TC_ERROR('00:60:00:00', '24.000', 'non-drop'))
        .toContain('timecode MM must be in range 00-59: "60"');
    expect(Code.TC_ERROR('00:99:00:00', '60.000', 'non-drop'))
        .toContain('timecode MM must be in range 00-59: "99"');
    
    expect(Code.TC_ERROR('00:00:60:00', '24.000', 'non-drop'))
        .toContain('timecode SS must be in range 00-59: "60"');
    expect(Code.TC_ERROR('00:00:99:00', '60.000', 'non-drop'))
        .toContain('timecode SS must be in range 00-59: "99"');

    expect(Code.TC_ERROR('00:00:00:24', '23.976', 'non-drop'))
        .toContain('timecode FF must be in range 00-23: "24"');
    expect(Code.TC_ERROR('00:00:00:30', '29.97', 'drop'))
        .toContain('timecode FF must be in range 00-29: "30"');
  });

  it('rejects invalid dropped frames', () => {
    expect(Code.TC_ERROR('00:01:00:00', '29.97', 'drop'))
        .toContain('timecode invalid: "00:01:00:00" is a dropped frame number');
    expect(Code.TC_ERROR('07:33:00:01', '29.970', 'drop'))
        .toContain('timecode invalid: "07:33:00:01" is a dropped frame number');
    
    expect(Code.TC_ERROR('00:01:00:02', '59.94', 'drop'))
        .toContain('timecode invalid: "00:01:00:02" is a dropped frame number');
    expect(Code.TC_ERROR('07:33:00:03', '59.94', 'drop'))
        .toContain('timecode invalid: "07:33:00:03" is a dropped frame number');
  });

  it('accepts valid format timecode', () => {
    expect(Code.TC_ERROR('  11:22:33:44  ', '60.000', 'non-drop')).toBe('');

    expect(Code.TC_ERROR('00:00:00:23', '23.976', 'non-drop')).toBe('');
    expect(Code.TC_ERROR('01:02:03:29', '29.97', 'drop')).toBe('');
    expect(Code.TC_ERROR('00:01:00:02', '29.970', 'drop')).toBe('');
    expect(Code.TC_ERROR('07:33:00:03', '29.97', 'drop')).toBe('');

    expect(Code.TC_ERROR('00:00:00;00', '29.97', 'drop')).toBe('');
    expect(Code.TC_ERROR('01;02;03;04', '59.940', 'drop')).toBe('');
  });
});

describe('TC_TO_FRAMEIDX', () => {
  it('rejects invalid timecode values and timecode standards', () => {
    expect(() => Code.TC_TO_FRAMEIDX(11223344, '60.000'))
        .toThrow(/timecode must be a single plain text value/);
    expect(() => Code.TC_TO_FRAMEIDX('1:2:3:4', '24.00', 'non-drop'))
        .toThrow(/timecode must be in HH:MM:SS:FF format: "1:2:3:4"/);
    expect(() => Code.TC_TO_FRAMEIDX('00:00:00:30', '29.97', 'drop'))
        .toThrow(/timecode FF must be in range 00-29: "30"/);
    expect(() => Code.TC_TO_FRAMEIDX('00:01:00:02', '59.94', 'drop'))
        .toThrow(/timecode invalid: "00:01:00:02" is a dropped frame number/);

    expect(() => Code.TC_TO_FRAMEIDX('01:02:03:04', '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.TC_TO_FRAMEIDX('01:02:03:04', '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('converts non-drop frames correctly', () => {
    expect(Code.TC_TO_FRAMEIDX('00:00:00:00', '24.00', 'non-drop')).toBe(0);
    expect(Code.TC_TO_FRAMEIDX('00:00:00:01', '29.97', 'non-drop')).toBe(1);
    expect(Code.TC_TO_FRAMEIDX('00:00:00:02', '50.000', 'non-drop')).toBe(2);

    expect(Code.TC_TO_FRAMEIDX('00:00:01:00', '24.00', 'non-drop')).toBe(24);
    expect(Code.TC_TO_FRAMEIDX('00:00:01:01', '29.97', 'non-drop')).toBe(31);
    expect(Code.TC_TO_FRAMEIDX('00:00:01:02', '50.000', 'non-drop')).toBe(52);

    // 160,402 timecode seconds plus 11 frames:
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '23.976', 'non-drop')).toBe(3849659);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '23.98', 'non-drop')).toBe(3849659);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '24.000', 'non-drop')).toBe(3849659);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '24.00', 'non-drop')).toBe(3849659);

    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '25.000', 'non-drop')).toBe(4010061);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '25.00', 'non-drop')).toBe(4010061);

    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '29.970', 'non-drop')).toBe(4812071);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '29.97', 'non-drop')).toBe(4812071);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '30.000', 'non-drop')).toBe(4812071);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '30.00', 'non-drop')).toBe(4812071);

    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '47.952', 'non-drop')).toBe(7699307);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '47.95', 'non-drop')).toBe(7699307);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '48.000', 'non-drop')).toBe(7699307);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '48.00', 'non-drop')).toBe(7699307);

    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '50.000', 'non-drop')).toBe(8020111);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '50.00', 'non-drop')).toBe(8020111);

    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '59.940', 'non-drop')).toBe(9624131);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '59.94', 'non-drop')).toBe(9624131);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '60.000', 'non-drop')).toBe(9624131);
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '60.00', 'non-drop')).toBe(9624131);
  });

  it('converts drop frames correctly', () => {
    expect(Code.TC_TO_FRAMEIDX('00:00:59:29', '29.97', 'drop')).toBe(1799);
    expect(Code.TC_TO_FRAMEIDX('00:01:00;02', '29.97', 'drop')).toBe(1800);

    // 6*44 + 3 = 267 blocks of 10 minutes, plus 00:03:22:11:

    // 29.97 drop: 17,982 frames per 10 minutes (267 * 17,982 = 4,801,194),
    //             plus 00:03:22:11 (202s*30/s + 11 = 6,071 frames; minus 3m * 2/m = 6 dropped),
    //             total 4,801,194 + 6,071 - 6 = 4,807,259.
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '29.970', 'drop')).toBe(4807259);
    expect(Code.TC_TO_FRAMEIDX('44:33:22;11', '29.97', 'drop')).toBe(4807259);

    // 59.94 drop: 35,964 frames per 10 minutes (267 * 35,964 = 9,602,388),
    //             plus 00:03:22:11 (202s*60/s + 11 = 12,131 frames; minus 3m * 4/m = 12 dropped),
    //             total 9,602,388 + 12,131 - 12 = 9,614,507.
    expect(Code.TC_TO_FRAMEIDX('44:33:22:11', '59.940', 'drop')).toBe(9614507);
    expect(Code.TC_TO_FRAMEIDX('44;33;22;11', '59.94', 'drop')).toBe(9614507);
  });
});

describe('FRAMEIDX_TO_WALL_SECS', () => {
  it('rejects invalid frameIdx values and timecode standards', () => {
    expect(() => Code.FRAMEIDX_TO_WALL_SECS(-1, '60.000'))
        .toThrow(/frameIdx must be non-negative integer/);

    expect(() => Code.FRAMEIDX_TO_WALL_SECS(27, '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.FRAMEIDX_TO_WALL_SECS(27, '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('converts frame indexes correctly', () => {
    expect(Code.FRAMEIDX_TO_WALL_SECS(52, '50.00', 'non-drop'))
        .toBeCloseTo(1.04, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(1799, '29.97', 'drop'))
        .toBeCloseTo(60.02663333, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(1800, '29.97', 'drop'))
        .toBeCloseTo(60.06, PRECISION_8DIGITS);

    // 44:33:22:11 => 160,402 timecode seconds plus 11 frames:

    expect(Code.FRAMEIDX_TO_WALL_SECS(3849659, '23.976', 'non-drop'))
        .toBeCloseTo(160562.86079167, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(3849659, '23.98', 'non-drop'))
        .toBeCloseTo(160562.86079167, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(3849659, '24.000', 'non-drop'))
        .toBeCloseTo(160402.45833333, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(3849659, '24.00', 'non-drop'))
        .toBeCloseTo(160402.45833333, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(4010061, '25.000', 'non-drop'))
        .toBeCloseTo(160402.44, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(4010061, '25.00', 'non-drop'))
        .toBeCloseTo(160402.44, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(4812071, '29.970', 'non-drop'))
        .toBeCloseTo(160562.76903333, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(4812071, '29.97', 'non-drop'))
        .toBeCloseTo(160562.76903333, PRECISION_8DIGITS);

    expect(Code.FRAMEIDX_TO_WALL_SECS(4812071, '30.000', 'non-drop'))
        .toBeCloseTo(160402.36666667, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(4812071, '30.00', 'non-drop'))
        .toBeCloseTo(160402.36666667, PRECISION_8DIGITS);

    expect(Code.FRAMEIDX_TO_WALL_SECS(7699307, '47.952', 'non-drop'))
        .toBeCloseTo(160562.63139583, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(7699307, '47.95', 'non-drop'))
        .toBeCloseTo(160562.63139583, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(7699307, '48.000', 'non-drop'))
        .toBeCloseTo(160402.22916667, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(7699307, '48.00', 'non-drop'))
        .toBeCloseTo(160402.22916667, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(8020111, '50.000', 'non-drop'))
        .toBeCloseTo(160402.22, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(8020111, '50.00', 'non-drop'))
        .toBeCloseTo(160402.22, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(9624131, '59.940', 'non-drop'))
        .toBeCloseTo(160562.58551667, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(9624131, '59.94', 'non-drop'))
        .toBeCloseTo(160562.58551667, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(9624131, '60.000', 'non-drop'))
        .toBeCloseTo(160402.18333333, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(9624131, '60.00', 'non-drop'))
        .toBeCloseTo(160402.18333333, PRECISION_8DIGITS);
    
    expect(Code.FRAMEIDX_TO_WALL_SECS(4807259, '29.970', 'drop'))
        .toBeCloseTo(160402.20863333, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(4807259, '29.97', 'drop'))
        .toBeCloseTo(160402.20863333, PRECISION_8DIGITS);

    expect(Code.FRAMEIDX_TO_WALL_SECS(9614507, '59.940', 'drop'))
        .toBeCloseTo(160402.02511667, PRECISION_8DIGITS);
    expect(Code.FRAMEIDX_TO_WALL_SECS(9614507, '59.94', 'drop'))
        .toBeCloseTo(160402.02511667, PRECISION_8DIGITS);
  });
});

describe('TC_TO_WALL_SECS', () => {
  it('rejects invalid timecode values and timecode standards', () => {
    expect(() => Code.TC_TO_WALL_SECS(11223344, '60.000'))
        .toThrow(/timecode must be a single plain text value/);
    expect(() => Code.TC_TO_WALL_SECS('1:2:3:4', '24.00', 'non-drop'))
        .toThrow(/timecode must be in HH:MM:SS:FF format: "1:2:3:4"/);
    expect(() => Code.TC_TO_WALL_SECS('00:00:00:30', '29.97', 'drop'))
        .toThrow(/timecode FF must be in range 00-29: "30"/);
    expect(() => Code.TC_TO_WALL_SECS('00:01:00:02', '59.94', 'drop'))
        .toThrow(/timecode invalid: "00:01:00:02" is a dropped frame number/);

    expect(() => Code.TC_TO_WALL_SECS('01:02:03:04', '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.TC_TO_WALL_SECS('01:02:03:04', '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('converts to wall seconds correctly', () => {
    expect(Code.TC_TO_WALL_SECS('00:00:01:02', '50.00', 'non-drop'))
        .toBeCloseTo(1.04, PRECISION_8DIGITS);

    expect(Code.TC_TO_WALL_SECS('00:00:59:29', '29.97', 'drop'))
        .toBeCloseTo(60.02663333, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('00:01:00;02', '29.97', 'drop'))
        .toBeCloseTo(60.06, PRECISION_8DIGITS);

    // 44:33:22:11 => 160,402 timecode seconds plus 11 frames:

    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '23.976', 'non-drop'))
        .toBeCloseTo(160562.86079167, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '23.98', 'non-drop'))
        .toBeCloseTo(160562.86079167, PRECISION_8DIGITS);
    
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '24.000', 'non-drop'))
        .toBeCloseTo(160402.45833333, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '24.00', 'non-drop'))
        .toBeCloseTo(160402.45833333, PRECISION_8DIGITS);
    
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '25.000', 'non-drop'))
        .toBeCloseTo(160402.44, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '25.00', 'non-drop'))
        .toBeCloseTo(160402.44, PRECISION_8DIGITS);
    
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '29.970', 'non-drop'))
        .toBeCloseTo(160562.76903333, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '29.97', 'non-drop'))
        .toBeCloseTo(160562.76903333, PRECISION_8DIGITS);

    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '30.000', 'non-drop'))
        .toBeCloseTo(160402.36666667, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '30.00', 'non-drop'))
        .toBeCloseTo(160402.36666667, PRECISION_8DIGITS);

    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '47.952', 'non-drop'))
        .toBeCloseTo(160562.63139583, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '47.95', 'non-drop'))
        .toBeCloseTo(160562.63139583, PRECISION_8DIGITS);
    
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '48.000', 'non-drop'))
        .toBeCloseTo(160402.22916667, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '48.00', 'non-drop'))
        .toBeCloseTo(160402.22916667, PRECISION_8DIGITS);
    
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '50.000', 'non-drop'))
        .toBeCloseTo(160402.22, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '50.00', 'non-drop'))
        .toBeCloseTo(160402.22, PRECISION_8DIGITS);
    
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '59.940', 'non-drop'))
        .toBeCloseTo(160562.58551667, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '59.94', 'non-drop'))
        .toBeCloseTo(160562.58551667, PRECISION_8DIGITS);
    
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '60.000', 'non-drop'))
        .toBeCloseTo(160402.18333333, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '60.00', 'non-drop'))
        .toBeCloseTo(160402.18333333, PRECISION_8DIGITS);
    
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '29.970', 'drop'))
        .toBeCloseTo(160402.20863333, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22;11', '29.97', 'drop'))
        .toBeCloseTo(160402.20863333, PRECISION_8DIGITS);

    expect(Code.TC_TO_WALL_SECS('44;33;22;11', '59.940', 'drop'))
        .toBeCloseTo(160402.02511667, PRECISION_8DIGITS);
    expect(Code.TC_TO_WALL_SECS('44:33:22:11', '59.94', 'drop'))
        .toBeCloseTo(160402.02511667, PRECISION_8DIGITS);
  });
});

describe('WALL_SECS_BETWEEN_TCS', () => {
  it('rejects invalid timecode values and timecode standards', () => {
    expect(() => Code.WALL_SECS_BETWEEN_TCS(11223344, '44:33:22:11', '60.000'))
        .toThrow(/timecode must be a single plain text value/);
    expect(() => Code.WALL_SECS_BETWEEN_TCS('44:33:22:11', '1:2:3:4', '24.00', 'non-drop'))
        .toThrow(/timecode must be in HH:MM:SS:FF format: "1:2:3:4"/);
    expect(() => Code.WALL_SECS_BETWEEN_TCS('00:00:00:30', '44:33:22:11', '29.97', 'drop'))
        .toThrow(/timecode FF must be in range 00-29: "30"/);
    expect(() => Code.WALL_SECS_BETWEEN_TCS('44:33:22:11', '00:01:00:02', '59.94', 'drop'))
        .toThrow(/timecode invalid: "00:01:00:02" is a dropped frame number/);

    expect(() => Code.WALL_SECS_BETWEEN_TCS('01:02:03:04', '44:33:22:11', '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.WALL_SECS_BETWEEN_TCS('01:02:03:04', '44:33:22:11', '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('computes correct positive duration when start is <= end', () => {
    expect(Code.WALL_SECS_BETWEEN_TCS('00:00:00:00', '00:00:00:00', '23.976', 'non-drop'))
        .toBeCloseTo(0.0, PRECISION_8DIGITS);
    expect(Code.WALL_SECS_BETWEEN_TCS('44:33:22:11', '44:33:22:11', '23.976', 'non-drop'))
        .toBeCloseTo(0.0, PRECISION_8DIGITS);
    
    expect(Code.WALL_SECS_BETWEEN_TCS('44:33:22:11', '44:33:23:11', '23.976', 'non-drop'))
        .toBeCloseTo(1.001, PRECISION_8DIGITS);

    expect(Code.WALL_SECS_BETWEEN_TCS('00:00:01:03', '00:02:05:11', '24.000', 'non-drop'))
        .toBeCloseTo(124.33333333, PRECISION_8DIGITS);

    // Times are 415,853 frames apart:
    expect(Code.WALL_SECS_BETWEEN_TCS('44:33:22:11', '46:29:00:04', '59.940', 'drop'))
        .toBeCloseTo(6937.81421667, PRECISION_8DIGITS);

    // 1 frame less than 100 hours (360,000 seconds):
    expect(Code.WALL_SECS_BETWEEN_TCS('00:00:00:00', '99:59:59:59', '60.000', 'non-drop'))
        .toBeCloseTo(359999.98333333, PRECISION_8DIGITS);
  });

  it('computes correct negative duration when start is > end', () => {
    // Times are 415,853 frames apart:
    expect(Code.WALL_SECS_BETWEEN_TCS('46:29:00:04', '44:33:22:11', '59.940', 'drop'))
        .toBeCloseTo(-6937.81421667, PRECISION_8DIGITS);

    // 1 frame less than 100 hours (360,000 seconds):
    expect(Code.WALL_SECS_BETWEEN_TCS('99:59:59:59', '00:00:00:00', '60.000', 'non-drop'))
        .toBeCloseTo(-359999.98333333, PRECISION_8DIGITS);
  });
});

describe('WALL_SECS_TO_DURSTR', () => {
  it('rejects non-finite number inputs', () => {
    expect(() => Code.WALL_SECS_TO_DURSTR('three'))
        .toThrow(/wallSecs must be a finite number/);
    expect(() => Code.WALL_SECS_TO_DURSTR(Number.NEGATIVE_INFINITY))
        .toThrow(/wallSecs must be a finite number/);
    expect(() => Code.WALL_SECS_TO_DURSTR(Number.NaN))
        .toThrow(/wallSecs must be a finite number/);
    expect(() => Code.WALL_SECS_TO_DURSTR(Number.POSITIVE_INFINITY))
        .toThrow(/wallSecs must be a finite number/);
  });

  it('works for positive durations', () => {
    expect(Code.WALL_SECS_TO_DURSTR(0)).toBe('00s');
    expect(Code.WALL_SECS_TO_DURSTR(Number.EPSILON)).toBe('00s');
    expect(Code.WALL_SECS_TO_DURSTR(0.49999999)).toBe('00s');
    expect(Code.WALL_SECS_TO_DURSTR(0.5)).toBe('01s');

    expect(Code.WALL_SECS_TO_DURSTR(1.0)).toBe('01s');
    expect(Code.WALL_SECS_TO_DURSTR(1.5)).toBe('02s');
    expect(Code.WALL_SECS_TO_DURSTR(59.49999999)).toBe('59s');
    expect(Code.WALL_SECS_TO_DURSTR(59.5)).toBe('01m 00s');
    expect(Code.WALL_SECS_TO_DURSTR(60.0)).toBe('01m 00s');
    expect(Code.WALL_SECS_TO_DURSTR(60.49999999)).toBe('01m 00s');

    expect(Code.WALL_SECS_TO_DURSTR(3540)).toBe('59m 00s');
    expect(Code.WALL_SECS_TO_DURSTR(3599.49999999)).toBe('59m 59s');
    expect(Code.WALL_SECS_TO_DURSTR(3600)).toBe('1h 00m 00s');
    expect(Code.WALL_SECS_TO_DURSTR(3765)).toBe('1h 02m 45s');

    expect(Code.WALL_SECS_TO_DURSTR(359999.49999999)).toBe('99h 59m 59s');
    expect(Code.WALL_SECS_TO_DURSTR(359999.98333333)).toBe('100h 00m 00s');
  });

  it('works for negative durations', () => {
    expect(Code.WALL_SECS_TO_DURSTR(-0)).toBe('00s');
    expect(Code.WALL_SECS_TO_DURSTR(-Number.EPSILON)).toBe('00s');
    expect(Code.WALL_SECS_TO_DURSTR(-0.49999999)).toBe('00s');
    expect(Code.WALL_SECS_TO_DURSTR(-0.5)).toBe('(-) 01s');

    expect(Code.WALL_SECS_TO_DURSTR(-1.0)).toBe('(-) 01s');
    expect(Code.WALL_SECS_TO_DURSTR(-1.5)).toBe('(-) 02s');
    expect(Code.WALL_SECS_TO_DURSTR(-59.49999999)).toBe('(-) 59s');
    expect(Code.WALL_SECS_TO_DURSTR(-59.5)).toBe('(-) 01m 00s');
    expect(Code.WALL_SECS_TO_DURSTR(-60.0)).toBe('(-) 01m 00s');
    expect(Code.WALL_SECS_TO_DURSTR(-60.49999999)).toBe('(-) 01m 00s');

    expect(Code.WALL_SECS_TO_DURSTR(-3540)).toBe('(-) 59m 00s');
    expect(Code.WALL_SECS_TO_DURSTR(-3599.49999999)).toBe('(-) 59m 59s');
    expect(Code.WALL_SECS_TO_DURSTR(-3600)).toBe('(-) 1h 00m 00s');
    expect(Code.WALL_SECS_TO_DURSTR(-3765)).toBe('(-) 1h 02m 45s');

    expect(Code.WALL_SECS_TO_DURSTR(-359999.49999999)).toBe('(-) 99h 59m 59s');
    expect(Code.WALL_SECS_TO_DURSTR(-359999.98333333)).toBe('(-) 100h 00m 00s');
  });
});

describe('WALL_SECS_TO_FRAMEIDX_LEFT', () => {
  it('rejects invalid wallSecs and timecode standards', () => {
    expect(() => Code.WALL_SECS_TO_FRAMEIDX_LEFT(Number.NEGATIVE_INFINITY, '25.00', 'non-drop'))
        .toThrow(/wallSecs must be a finite number/);
    expect(() => Code.WALL_SECS_TO_FRAMEIDX_LEFT(Number.NaN, '25.00', 'non-drop'))
        .toThrow(/wallSecs must be a finite number/);
    expect(() => Code.WALL_SECS_TO_FRAMEIDX_LEFT(Number.POSITIVE_INFINITY, '25.00', 'non-drop'))
        .toThrow(/wallSecs must be a finite number/);

    expect(() => Code.WALL_SECS_TO_FRAMEIDX_LEFT(52, '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.WALL_SECS_TO_FRAMEIDX_LEFT(52, '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('converts zero and positive wallSecs correctly', () => {
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(0, '23.976', 'non-drop')).toBe(0);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(0, '24.00', 'non-drop')).toBe(0);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(0, '50.00', 'non-drop')).toBe(0);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(1.03999999, '50.00', 'non-drop')).toBe(51);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(1.04, '50.00', 'non-drop')).toBe(52);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(1.04000001, '50.00', 'non-drop')).toBe(52);
    
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(60.02663333, '29.97', 'drop')).toBe(1798);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(60.02663334, '29.97', 'drop')).toBe(1799);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(60.06, '29.97', 'drop')).toBe(1800);

    // 44:33:22:11 => 160,402 timecode seconds plus 11 frames:

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.86079166, '23.976', 'non-drop')).toBe(3849658);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.86079166, '23.98', 'non-drop')).toBe(3849658);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.86079167, '23.976', 'non-drop')).toBe(3849659);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.86079167, '23.98', 'non-drop')).toBe(3849659);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.45833333, '24.000', 'non-drop')).toBe(3849658);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.45833333, '24.00', 'non-drop')).toBe(3849658);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.45833334, '24.000', 'non-drop')).toBe(3849659);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.45833334, '24.00', 'non-drop')).toBe(3849659);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.43999999, '25.000', 'non-drop')).toBe(4010060);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.43999999, '25.00', 'non-drop')).toBe(4010060);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.44, '25.000', 'non-drop')).toBe(4010061);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.44, '25.00', 'non-drop')).toBe(4010061);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.44000001, '25.000', 'non-drop')).toBe(4010061);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.44000001, '25.00', 'non-drop')).toBe(4010061);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.76903333, '29.970', 'non-drop')).toBe(4812070);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.76903333, '29.97', 'non-drop')).toBe(4812070);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.76903334, '29.970', 'non-drop')).toBe(4812071);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.76903334, '29.97', 'non-drop')).toBe(4812071);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.36666666, '30.000', 'non-drop')).toBe(4812070);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.36666666, '30.00', 'non-drop')).toBe(4812070);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.36666667, '30.000', 'non-drop')).toBe(4812071);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.36666667, '30.00', 'non-drop')).toBe(4812071);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.63139583, '47.952', 'non-drop')).toBe(7699306);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.63139583, '47.95', 'non-drop')).toBe(7699306);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.63139584, '47.952', 'non-drop')).toBe(7699307);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.63139584, '47.95', 'non-drop')).toBe(7699307);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.22916666, '48.000', 'non-drop')).toBe(7699306);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.22916666, '48.00', 'non-drop')).toBe(7699306);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.22916667, '48.000', 'non-drop')).toBe(7699307);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.22916667, '48.00', 'non-drop')).toBe(7699307);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.21999999, '50.000', 'non-drop')).toBe(8020110);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.21999999, '50.00', 'non-drop')).toBe(8020110);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.22, '50.000', 'non-drop')).toBe(8020111);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.22, '50.00', 'non-drop')).toBe(8020111);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.22000001, '50.000', 'non-drop')).toBe(8020111);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.22000001, '50.00', 'non-drop')).toBe(8020111);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.58551666, '59.940', 'non-drop')).toBe(9624130);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.58551666, '59.94', 'non-drop')).toBe(9624130);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.58551667, '59.940', 'non-drop')).toBe(9624131);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160562.58551667, '59.94', 'non-drop')).toBe(9624131);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.18333333, '60.000', 'non-drop')).toBe(9624130);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.18333333, '60.00', 'non-drop')).toBe(9624130);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.18333334, '60.000', 'non-drop')).toBe(9624131);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.18333334, '60.00', 'non-drop')).toBe(9624131);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.20863333, '29.970', 'drop')).toBe(4807258);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.20863333, '29.97', 'drop')).toBe(4807258);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.20863334, '29.970', 'drop')).toBe(4807259);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.20863334, '29.97', 'drop')).toBe(4807259);

    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.02511666, '59.940', 'drop')).toBe(9614506);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.02511666, '59.94', 'drop')).toBe(9614506);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.02511667, '59.940', 'drop')).toBe(9614507);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(160402.02511667, '59.94', 'drop')).toBe(9614507);
  });

  it('converts negative wallSecs correctly', () => {
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(-1.03999999, '50.00', 'non-drop')).toBe(-52);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(-1.04, '50.00', 'non-drop')).toBe(-52);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(-1.04000001, '50.00', 'non-drop')).toBe(-53);
    
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(-60.02663333, '29.97', 'drop')).toBe(-1799);
    expect(Code.WALL_SECS_TO_FRAMEIDX_LEFT(-60.02663334, '29.97', 'drop')).toBe(-1800);
  });
});

describe('WALL_SECS_TO_FRAMEIDX_RIGHT', () => {
  it('rejects invalid wallSecs and timecode standards', () => {
    expect(() => Code.WALL_SECS_TO_FRAMEIDX_RIGHT(Number.NEGATIVE_INFINITY, '25.00', 'non-drop'))
        .toThrow(/wallSecs must be a finite number/);
    expect(() => Code.WALL_SECS_TO_FRAMEIDX_RIGHT(Number.NaN, '25.00', 'non-drop'))
        .toThrow(/wallSecs must be a finite number/);
    expect(() => Code.WALL_SECS_TO_FRAMEIDX_RIGHT(Number.POSITIVE_INFINITY, '25.00', 'non-drop'))
        .toThrow(/wallSecs must be a finite number/);

    expect(() => Code.WALL_SECS_TO_FRAMEIDX_RIGHT(52, '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.WALL_SECS_TO_FRAMEIDX_RIGHT(52, '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('converts zero and positive wallSecs correctly', () => {
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(0, '23.976', 'non-drop')).toBe(0);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(0, '24.00', 'non-drop')).toBe(0);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(0, '50.00', 'non-drop')).toBe(0);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(1.03999999, '50.00', 'non-drop')).toBe(52);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(1.04, '50.00', 'non-drop')).toBe(52);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(1.04000001, '50.00', 'non-drop')).toBe(53);
    
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(60.02663333, '29.97', 'drop')).toBe(1799);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(60.02663334, '29.97', 'drop')).toBe(1800);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(60.06, '29.97', 'drop')).toBe(1800);

    // 44:33:22:11 => 160,402 timecode seconds plus 11 frames:

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.86079166, '23.976', 'non-drop')).toBe(3849659);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.86079166, '23.98', 'non-drop')).toBe(3849659);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.86079167, '23.976', 'non-drop')).toBe(3849660);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.86079167, '23.98', 'non-drop')).toBe(3849660);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.45833333, '24.000', 'non-drop')).toBe(3849659);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.45833333, '24.00', 'non-drop')).toBe(3849659);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.45833334, '24.000', 'non-drop')).toBe(3849660);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.45833334, '24.00', 'non-drop')).toBe(3849660);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.43999999, '25.000', 'non-drop')).toBe(4010061);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.43999999, '25.00', 'non-drop')).toBe(4010061);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.44, '25.000', 'non-drop')).toBe(4010061);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.44, '25.00', 'non-drop')).toBe(4010061);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.44000001, '25.000', 'non-drop')).toBe(4010062);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.44000001, '25.00', 'non-drop')).toBe(4010062);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.76903333, '29.970', 'non-drop')).toBe(4812071);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.76903333, '29.97', 'non-drop')).toBe(4812071);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.76903334, '29.970', 'non-drop')).toBe(4812072);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.76903334, '29.97', 'non-drop')).toBe(4812072);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.36666666, '30.000', 'non-drop')).toBe(4812071);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.36666666, '30.00', 'non-drop')).toBe(4812071);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.36666667, '30.000', 'non-drop')).toBe(4812072);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.36666667, '30.00', 'non-drop')).toBe(4812072);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.63139583, '47.952', 'non-drop')).toBe(7699307);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.63139583, '47.95', 'non-drop')).toBe(7699307);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.63139584, '47.952', 'non-drop')).toBe(7699308);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.63139584, '47.95', 'non-drop')).toBe(7699308);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.22916666, '48.000', 'non-drop')).toBe(7699307);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.22916666, '48.00', 'non-drop')).toBe(7699307);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.22916667, '48.000', 'non-drop')).toBe(7699308);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.22916667, '48.00', 'non-drop')).toBe(7699308);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.21999999, '50.000', 'non-drop')).toBe(8020111);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.21999999, '50.00', 'non-drop')).toBe(8020111);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.22, '50.000', 'non-drop')).toBe(8020111);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.22, '50.00', 'non-drop')).toBe(8020111);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.22000001, '50.000', 'non-drop')).toBe(8020112);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.22000001, '50.00', 'non-drop')).toBe(8020112);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.58551666, '59.940', 'non-drop')).toBe(9624131);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.58551666, '59.94', 'non-drop')).toBe(9624131);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.58551667, '59.940', 'non-drop')).toBe(9624132);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160562.58551667, '59.94', 'non-drop')).toBe(9624132);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.18333333, '60.000', 'non-drop')).toBe(9624131);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.18333333, '60.00', 'non-drop')).toBe(9624131);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.18333334, '60.000', 'non-drop')).toBe(9624132);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.18333334, '60.00', 'non-drop')).toBe(9624132);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.20863333, '29.970', 'drop')).toBe(4807259);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.20863333, '29.97', 'drop')).toBe(4807259);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.20863334, '29.970', 'drop')).toBe(4807260);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.20863334, '29.97', 'drop')).toBe(4807260);

    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.02511666, '59.940', 'drop')).toBe(9614507);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.02511666, '59.94', 'drop')).toBe(9614507);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.02511667, '59.940', 'drop')).toBe(9614508);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(160402.02511667, '59.94', 'drop')).toBe(9614508);
  });

  it('converts negative wallSecs correctly', () => {
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(-1.03999999, '50.00', 'non-drop')).toBe(-51);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(-1.04, '50.00', 'non-drop')).toBe(-52);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(-1.04000001, '50.00', 'non-drop')).toBe(-52);
    
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(-60.02663333, '29.97', 'drop')).toBe(-1798);
    expect(Code.WALL_SECS_TO_FRAMEIDX_RIGHT(-60.02663334, '29.97', 'drop')).toBe(-1799);
  });
});

describe('WALL_SECS_TO_TC_LEFT', () => {
  it('rejects invalid wallSecs values and timecode standards', () => {
    expect(() => Code.WALL_SECS_TO_TC_LEFT(-123.45, '60.000'))
        .toThrow(/negative timecode values are not supported/);

    expect(() => Code.WALL_SECS_TO_TC_LEFT(123.45, '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.WALL_SECS_TO_TC_LEFT(123.45, '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('converts to wall seconds correctly', () => {
    expect(Code.WALL_SECS_TO_TC_LEFT(1.04, '50.00', 'non-drop')).toBe('00:00:01:02');

    expect(Code.WALL_SECS_TO_TC_RIGHT(60.02663333, '29.97', 'drop')).toBe('00:00:59:29');
    expect(Code.WALL_SECS_TO_TC_RIGHT(60.02663334, '29.97', 'drop')).toBe('00:01:00:02');

    expect(Code.WALL_SECS_TO_TC_LEFT(60.02663333, '29.97', 'drop')).toBe('00:00:59:28');
    expect(Code.WALL_SECS_TO_TC_LEFT(60.02663334, '29.97', 'drop')).toBe('00:00:59:29');
    expect(Code.WALL_SECS_TO_TC_LEFT(60.06, '29.97', 'drop')).toBe('00:01:00:02');

    // 44:33:22:11 => 160,402 timecode seconds plus 11 frames:

    expect(Code.WALL_SECS_TO_TC_LEFT(160562.86079167, '23.976', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160562.86079167, '23.98', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.45833334, '24.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.45833334, '24.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.44, '25.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.44, '25.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_LEFT(160562.76903334, '29.970', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160562.76903334, '29.97', 'non-drop')).toBe('44:33:22:11');

    expect(Code.WALL_SECS_TO_TC_LEFT(160402.36666667, '30.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.36666667, '30.00', 'non-drop')).toBe('44:33:22:11');

    expect(Code.WALL_SECS_TO_TC_LEFT(160562.63139584, '47.952', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160562.63139584, '47.95', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.22916667, '48.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.22916667, '48.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.22, '50.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.22, '50.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_LEFT(160562.58551667, '59.940', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160562.58551667, '59.94', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.18333334, '60.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.18333334, '60.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.20863334, '29.970', 'drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.20863334, '29.97', 'drop')).toBe('44:33:22:11');

    expect(Code.WALL_SECS_TO_TC_LEFT(160402.02511667, '59.940', 'drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_LEFT(160402.02511667, '59.94', 'drop')).toBe('44:33:22:11');
  });
});

describe('WALL_SECS_TO_TC_RIGHT', () => {
  it('rejects invalid wallSecs values and timecode standards', () => {
    expect(() => Code.WALL_SECS_TO_TC_RIGHT(-123.45, '60.000'))
        .toThrow(/negative timecode values are not supported/);

    expect(() => Code.WALL_SECS_TO_TC_RIGHT(123.45, '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.WALL_SECS_TO_TC_RIGHT(123.45, '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('converts to wall seconds correctly', () => {
    expect(Code.WALL_SECS_TO_TC_RIGHT(1.04, '50.00', 'non-drop')).toBe('00:00:01:02');

    expect(Code.WALL_SECS_TO_TC_RIGHT(60.02663333, '29.97', 'drop')).toBe('00:00:59:29');
    expect(Code.WALL_SECS_TO_TC_RIGHT(60.02663334, '29.97', 'drop')).toBe('00:01:00:02');

    // 44:33:22:11 => 160,402 timecode seconds plus 11 frames:

    expect(Code.WALL_SECS_TO_TC_RIGHT(160562.86079166, '23.976', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160562.86079166, '23.98', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.45833333, '24.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.45833333, '24.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.44, '25.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.44, '25.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_RIGHT(160562.76903333, '29.970', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160562.76903333, '29.97', 'non-drop')).toBe('44:33:22:11');

    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.36666666, '30.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.36666666, '30.00', 'non-drop')).toBe('44:33:22:11');

    expect(Code.WALL_SECS_TO_TC_RIGHT(160562.63139583, '47.952', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160562.63139583, '47.95', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.22916666, '48.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.22916666, '48.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.22, '50.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.22, '50.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_RIGHT(160562.58551666, '59.940', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160562.58551666, '59.94', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.18333333, '60.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.18333333, '60.00', 'non-drop')).toBe('44:33:22:11');
    
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.20863333, '29.970', 'drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.20863333, '29.97', 'drop')).toBe('44:33:22:11');

    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.02511666, '59.940', 'drop')).toBe('44:33:22:11');
    expect(Code.WALL_SECS_TO_TC_RIGHT(160402.02511666, '59.94', 'drop')).toBe('44:33:22:11');
  });
});

describe('FRAMEIDX_TO_TC', () => {
  it('rejects invalid frameIdx values and timecode standards', () => {
    expect(() => Code.FRAMEIDX_TO_TC(-1234, '60.000'))
        .toThrow(/negative timecode values are not supported/);

    expect(() => Code.FRAMEIDX_TO_TC(1234, '12.00', 'non-drop'))
        .toThrow(/Unsupported frame rate: "12.00"/);
    expect(() => Code.FRAMEIDX_TO_TC(1234, '25.000', 'nondrop'))
        .toThrow(/dropType value must be "non-drop" or "drop"/);
  });

  it('converts non-drop frames correctly', () => {
    expect(Code.FRAMEIDX_TO_TC(0, '24.00', 'non-drop')).toBe('00:00:00:00');
    expect(Code.FRAMEIDX_TO_TC(1, '29.97', 'non-drop')).toBe('00:00:00:01');
    expect(Code.FRAMEIDX_TO_TC(2, '50.000', 'non-drop')).toBe('00:00:00:02');

    expect(Code.FRAMEIDX_TO_TC(24, '24.00', 'non-drop')).toBe('00:00:01:00');
    expect(Code.FRAMEIDX_TO_TC(31, '29.97', 'non-drop')).toBe('00:00:01:01');
    expect(Code.FRAMEIDX_TO_TC(52, '50.000', 'non-drop')).toBe('00:00:01:02');

    // 160,402 timecode seconds plus 11 frames:
    expect(Code.FRAMEIDX_TO_TC(3849659, '23.976', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(3849659, '23.98', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(3849659, '24.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(3849659, '24.00', 'non-drop')).toBe('44:33:22:11');

    expect(Code.FRAMEIDX_TO_TC(4010061, '25.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(4010061, '25.00', 'non-drop')).toBe('44:33:22:11');

    expect(Code.FRAMEIDX_TO_TC(4812071, '29.970', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(4812071, '29.97', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(4812071, '30.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(4812071, '30.00', 'non-drop')).toBe('44:33:22:11');

    expect(Code.FRAMEIDX_TO_TC(7699307, '47.952', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(7699307, '47.95', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(7699307, '48.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(7699307, '48.00', 'non-drop')).toBe('44:33:22:11');

    expect(Code.FRAMEIDX_TO_TC(8020111, '50.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(8020111, '50.00', 'non-drop')).toBe('44:33:22:11');

    expect(Code.FRAMEIDX_TO_TC(9624131, '59.940', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(9624131, '59.94', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(9624131, '60.000', 'non-drop')).toBe('44:33:22:11');
    expect(Code.FRAMEIDX_TO_TC(9624131, '60.00', 'non-drop')).toBe('44:33:22:11');
  });

  it('converts drop frames correctly', () => {
    expect(Code.FRAMEIDX_TO_TC(1799, '29.97', 'drop')).toBe('00:00:59:29');
    expect(Code.FRAMEIDX_TO_TC(1800, '29.97', 'drop')).toBe('00:01:00:02');

    // 6*44 + 3 = 267 blocks of 10 minutes, plus 00:03:22:11:

    // 29.97 drop: 17,982 frames per 10 minutes (267 * 17,982 = 4,801,194),
    //             plus 00:03:22:11 (202s*30/s + 11 = 6,071 frames; minus 3m * 2/m = 6 dropped),
    //             total 4,801,194 + 6,071 - 6 = 4,807,259.
    expect(Code.FRAMEIDX_TO_TC(4807259, '29.970', 'drop')).toBe('44:33:22:11');

    // 59.94 drop: 35,964 frames per 10 minutes (267 * 35,964 = 9,602,388),
    //             plus 00:03:22:11 (202s*60/s + 11 = 12,131 frames; minus 3m * 4/m = 12 dropped),
    //             total 9,602,388 + 12,131 - 12 = 9,614,507.
    expect(Code.FRAMEIDX_TO_TC(9614507, '59.940', 'drop')).toBe('44:33:22:11');
  });
});

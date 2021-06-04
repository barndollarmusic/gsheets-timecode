// gsheets-timecode: Google Sheets Apps Script custom functions for working
// with video timecode standards and wall time durations.
//
// Designed for film & television composers, though these may be useful for
// anyone who works with timecode values in Google Sheets.
//
// Author: Eric Barndollar (https://barndollarmusic.com)
//
// The easiest way to use yourself is to use File > Make a copy on this Sheet:
// https://docs.google.com/spreadsheets/d/1xPi0lxi4-4NmZmNoTXXoCNa0FGIAhwi2QCPjTABJCw4/edit?usp=sharing
//
// Code on GitHub: https://github.com/barndollarmusic/gsheets-timecode
// (If you made a copy, check above link for the most updated version).
//
// This is open source software that is free to use and share, as covered by the
// MIT License.
//
// Custom Functions list (with example arguments):
// - TC_TO_WALL_SECS("00:00:01:02", "50.00", "non-drop"): 1.04 secs (wall time)
// - WALL_SECS_BETWEEN_TCS("00:00:01:03", "00:02:05:11", "24.00", "non-drop"):
//       124.33333333... secs (wall time)
// - WALL_SECS_TO_DURSTR(3765): "1h 02m 45s" (human-readable duration string)
// - WALL_SECS_TO_TC_LEFT(1.041, "50.00", "non-drop"): "00:00:01:02" (timecode <= wallSecs)
// - WALL_SECS_TO_TC_RIGHT(1.041, "50.00", "non-drop"): "00:00:01:03" (timecode >= wallSecs)
// - TC_ERROR("01:02:03:04", "23.976", "non-drop"): error string if invalid
//
// - TC_TO_FRAMEIDX("00:00:01:02", "50.00", "non-drop"): 52 (frame index)
// - FRAMEIDX_TO_TC(52, "50.00", "non-drop"): "00:00:01:02" (timecode)
// - FRAMEIDX_TO_WALL_SECS(52, "50.00", "non-drop"): 1.04 secs (wall time)
// - WALL_SECS_TO_FRAMEIDX_LEFT(1.041, "50.00", "non-drop"): 52 (frame index <= time)
// - WALL_SECS_TO_FRAMEIDX_RIGHT(1.041, "50.00", "non-drop"): 53 (frame index >= time)

/**
 * Support these values of input frameRate strings. Require exactly 2 or 3
 * decimal digits of precision to avoid confusion as to e.g. whether "24"
 * means 24.000 or 23.976.
 * @private
 */
const FRAME_RATES_ = {
  '23.976': {frames: 24000, perWallSecs: 1001},  // 23.976023976023976...
  '23.98': {frames: 24000, perWallSecs: 1001},   // 23.976023976023976...
  '24.000': {frames: 24, perWallSecs: 1},
  '24.00': {frames: 24, perWallSecs: 1},
  '25.000': {frames: 25, perWallSecs: 1},
  '25.00': {frames: 25, perWallSecs: 1},
  '29.970': {frames: 30000, perWallSecs: 1001},  // 29.97002997002997...
  '29.97': {frames: 30000, perWallSecs: 1001},   // 29.97002997002997...
  '30.000': {frames: 30, perWallSecs: 1},
  '30.00': {frames: 30, perWallSecs: 1},
  '47.952': {frames: 48000, perWallSecs: 1001},  // 47.952047952047952...
  '47.95': {frames: 48000, perWallSecs: 1001},   // 47.952047952047952...
  '48.000': {frames: 48, perWallSecs: 1},
  '48.00': {frames: 48, perWallSecs: 1},
  '50.000': {frames: 50, perWallSecs: 1},
  '50.00': {frames: 50, perWallSecs: 1},
  '59.940': {frames: 60000, perWallSecs: 1001},  // 59.94005994005994...
  '59.94': {frames: 60000, perWallSecs: 1001},   // 59.94005994005994...
  '60.000': {frames: 60, perWallSecs: 1},
  '60.00': {frames: 60, perWallSecs: 1},
};

/**
 * The number of frames dropped per 10 minutes for supported drop frame
 * rate timecode standards.
 * @private
 */
const DROP_FRAMES_PER_10MINS_ = {
  '29.970': 18,  // First 2 frames of minutes x1, x2, ..., x9.
  '29.97': 18,   // First 2 frames of minutes x1, x2, ..., x9.
  '59.940': 36,  // First 4 frames of minutes x1, x2, ..., x9.
  '59.94': 36,   // First 4 frames of minutes x1, x2, ..., x9.
};

/** @private */
const FRAME_RATE_STR_FMT_ = /^[0-9][0-9].[0-9][0-9][0-9]?$/;

/**
 * Internal configuration data for a timecode standard.
 * @typedef {{
 *   frames: number,
 *   perWallSecs: number,
 *   intFps: number,
 *   dropFramesPer10Mins: number,
 * }} TimecodeStandard
 */

/**
 * @param {string} frameRateStr
 * @param {string} dropTypeStr
 * @return {TimecodeStandard}
 * @private
 */
function parseTcStd_(frameRateStr, dropTypeStr) {
  if (typeof frameRateStr !== 'string') {
    throw Error('frameRate must be a single plain text value');
  }
  frameRateStr = frameRateStr.trim();

  if (!FRAME_RATE_STR_FMT_.test(frameRateStr)) {
    throw Error('frameRate must contain 2 or 3 digits after period (e.g. "23.976" or "24.00")');
  }
  const frameRate = FRAME_RATES_[frameRateStr];
  if (!frameRate) {
    throw Error(`Unsupported frame rate: "${frameRateStr}"`);
  }

  if (typeof dropTypeStr !== 'string') {
    throw Error('dropType must be a single plain text value');
  }
  dropTypeStr = dropTypeStr.trim().toLowerCase();
  if ((dropTypeStr !== 'drop') && (dropTypeStr !== 'non-drop')) {
    throw Error('dropType value must be "non-drop" or "drop" (without quotes)');
  }

  let dropFramesPer10Mins = 0;
  if (dropTypeStr === 'drop') {
    if (!(frameRateStr in DROP_FRAMES_PER_10MINS_)) {
      throw Error(`frameRate ${frameRateStr} must be non-drop`);
    }
    dropFramesPer10Mins = DROP_FRAMES_PER_10MINS_[frameRateStr];
  }

  return {
    frames: frameRate.frames,
    perWallSecs: frameRate.perWallSecs,
    intFps: Math.ceil(frameRate.frames / frameRate.perWallSecs),
    dropFramesPer10Mins: dropFramesPer10Mins,
  };
}

/**
 * Parsed numerical timecode.
 * @typedef {{hh: number, mm: number, ss: number, ff: number}} ParsedTimecode
 */

/**
 * @param {string} timecode
 * @return {ParsedTimecode}
 * @private
 */
function parseTc_(timecode) {
  if (typeof timecode !== 'string') {
    throw Error('timecode must be a single plain text value');
  }

  const matches = timecode.trim().match(TC_STR_FMT_);
  if (!matches) {
    throw Error(`timecode must be in HH:MM:SS:FF format: "${timecode}"`);
  }

  return {
    hh: Number(matches[1]),
    mm: Number(matches[2]),
    ss: Number(matches[3]),
    ff: Number(matches[4]),
  };
}

/**
 * @param {ParsedTimecode} tc
 * @param {TimecodeStandard} tcStd
 * @return {boolean}
 * @private
 */
function isDropSec_(tc, tcStd) {
  if (tcStd.dropFramesPer10Mins === 0) {
    return false;  // Not a drop frame standard.
  }

  // A block of frames is dropped from the first second (SS=00) of each minute
  // that is not divisible by 10 (MM=x1, x2, ..., x9).
  return (tc.ss === 0) && ((tc.mm % 10) !== 0);
}

/**
 * @param {TimecodeStandard} tcStd
 * @return {number}
 * @private
 */
function framesPerDroppedBlock_(tcStd) {
  // A block of frames is dropped from the first second (SS=00) of 9 out of every
  // 10 minutes. For 29.97 fps, for example, there are 18 frames dropped per 10
  // minutes, in blocks of 2 frames at a time.
  return tcStd.dropFramesPer10Mins / 9;
}

/** @private */
const TC_STR_FMT_ = /^([0-9][0-9])[:;]([0-9][0-9])[:;]([0-9][0-9])[:;]([0-9][0-9])$/;

/** @private */
const MINS_PER_HR_ = 60;

/** @private */
const SECS_PER_MIN_ = 60;

/**
 * @param {string} timecode (Just for error messages).
 * @param {ParsedTimecode} tc
 * @param {TimecodeStandard} tcStd
 * @throws {Error} if invalid.
 * @private
 */
function validateTc_(timecode, tc, tcStd) {
  // Ensure each segment of timecode is in valid range (and not a dropped frame).

  // All digit HH values (00-99) are valid...

  if (tc.mm >= MINS_PER_HR_) {
    throw Error(`timecode MM must be in range 00-59: "${tc.mm}"`);
  }

  if (tc.ss >= SECS_PER_MIN_) {
    throw Error(`timecode SS must be in range 00-59: "${tc.ss}"`);
  }

  if (tc.ff >= tcStd.intFps) {
    throw Error(`timecode FF must be in range 00-${tcStd.intFps - 1}: "${tc.ff}"`);
  }

  // Frame number must not be a dropped frame.
  if (isDropSec_(tc, tcStd)) {
    if (tc.ff < framesPerDroppedBlock_(tcStd)) {
      throw Error(`timecode invalid: "${timecode}" is a dropped frame number`);
    }
  }

  // If timecode string used semicolons, make sure it was a drop standard.
  const hasSemicolons = (timecode.indexOf(';') >= 0);
  if (hasSemicolons && (tcStd.dropFramesPer10Mins === 0)) {
    throw Error(`only drop timecode may use semi-colon separator: "${timecode}"`);
  }
}

/**
 * Returns empty string if the input timecode value is valid time in the given timecode
 * standard, or a non-empty error otherwise.
 * @param {string} timecode Timecode value in "HH:MM:SS:FF" format (without
 *     quotes). May use semicolons in drop frame standards.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {string} Empty string if valid, or non-empty error message.
 * @customFunction
 */
function TC_ERROR(timecode, frameRate, dropType = 'non-drop') {
  try {
    const tcStd = parseTcStd_(frameRate, dropType);
    const tc = parseTc_(timecode);
    validateTc_(timecode, tc, tcStd);
    return '';
  } catch (e) {
    return e.toString();
  }
}

/**
 * Converts input timecode to frame index (where 00:00:00:00 has index 0,
 * 00:00:00:01 index 1, etc.).
 * 
 * If this is a drop frame standard, dropped frames are not given indexes
 * (so in 29.97 drop, 00:00:59:29 has index 1799 and 00:01:00:02 has index 1800).
 * @param {string} timecode Timecode value in "HH:MM:SS:FF" format (without
 *     quotes). May use semicolons in drop frame standards.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {number} Frame index.
 * @customFunction
 */
function TC_TO_FRAMEIDX(timecode, frameRate, dropType = 'non-drop') {
  const tcStd = parseTcStd_(frameRate, dropType);
  const tc = parseTc_(timecode);
  validateTc_(timecode, tc, tcStd);
  return tcToFrameIdx_(tc, tcStd);
}

/**
 * @param {ParsedTimecode} tc
 * @param {TimecodeStandard} tcStd
 * @return {number}
 * @private
 */
function tcToFrameIdx_(tc, tcStd) {
  // Calculate first ignoring dropped frames.
  const tcTotalMins = (MINS_PER_HR_ * tc.hh) + tc.mm;
  const tcTotalSecs = (SECS_PER_MIN_ * tcTotalMins) + tc.ss;
  let frameIdx = (tcStd.intFps * tcTotalSecs) + tc.ff;

  // Adjust for any frame numbers that were dropped.
  if (tcStd.dropFramesPer10Mins > 0) {
    // Frames dropped through start of HH:
    const framesDroppedPerHr = 6 * tcStd.dropFramesPer10Mins;
    frameIdx -= tc.hh * framesDroppedPerHr;

    // Frames dropped from start of HH to start of this 10 minute block:
    frameIdx -= Math.floor(tc.mm / 10) * tcStd.dropFramesPer10Mins;

    // Frames dropped since start of this 10 minute block:
    frameIdx -= (tc.mm % 10) * framesPerDroppedBlock_(tcStd);
  }

  return frameIdx;
}

/**
 * Converts input frame index to wall time in seconds offset from origin
 * time 00:00:00:00.
 * @param {number} frameIdx The 0-based frame index.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {number} Wall time in seconds (possibly fractional).
 * @customFunction
 */
function FRAMEIDX_TO_WALL_SECS(frameIdx, frameRate, dropType = 'non-drop') {
  const tcStd = parseTcStd_(frameRate, dropType);
  if (!Number.isInteger(frameIdx) || (frameIdx < 0)) {
    throw Error('frameIdx must be non-negative integer');
  }
  return frameIdxToWallSecs_(frameIdx, tcStd);
}

/**
 * @param {number} frameIdx
 * @param {TimecodeStandard} tcStd
 * @return {number}
 * @private
 */
function frameIdxToWallSecs_(frameIdx, tcStd) {
  return frameIdx * tcStd.perWallSecs / tcStd.frames;
}

/**
 * Converts input timecode to wall time in seconds offset from origin
 * time 00:00:00:00.
 * @param {string} timecode Timecode value in "HH:MM:SS:FF" format (without
 *     quotes). May use semicolons in drop frame standards.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {number} Wall time in seconds (possibly fractional).
 * @customFunction
 */
function TC_TO_WALL_SECS(timecode, frameRate, dropType = 'non-drop') {
  const tcStd = parseTcStd_(frameRate, dropType);
  const tc = parseTc_(timecode);
  validateTc_(timecode, tc, tcStd);

  const frameIdx = tcToFrameIdx_(tc, tcStd);
  return frameIdxToWallSecs_(frameIdx, tcStd);
}

/**
 * Returns wall time in seconds between the given start and end timecodes. If end
 * is before start, the returned value will be negative.
 * @param {string} start Start timecode value in "HH:MM:SS:FF" format (without
 *     quotes). May use semicolons in drop frame standards.
 * @param {string} end End timecode value in "HH:MM:SS:FF" format (without
 *     quotes). May use semicolons in drop frame standards.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {number} Duration from start to end as measured by wall time in seconds
 *     (possibly fractional).
 * @customFunction
 */
function WALL_SECS_BETWEEN_TCS(start, end, frameRate, dropType = 'non-drop') {
  const tcStd = parseTcStd_(frameRate, dropType);

  const startTc = parseTc_(start);
  validateTc_(start, startTc, tcStd);

  const endTc = parseTc_(end);
  validateTc_(end, endTc, tcStd);

  const startIdx = tcToFrameIdx_(startTc, tcStd);
  const endIdx = tcToFrameIdx_(endTc, tcStd);

  return (endIdx - startIdx) * tcStd.perWallSecs / tcStd.frames;
}

/**
 * Converts time in wall seconds to a more human-readable duration string. Rounds
 * fractional seconds to the nearest value (with 0.5 rounding up).
 * 
 * Example output for 4994.5 seconds is "1h 23m 15s".
 * @param {number} wallSecs Duration in wall seconds (possibly fractional).
 * @return {string} Human-readable duration string.
 * @customFunction
 */
function WALL_SECS_TO_DURSTR(wallSecs) {
  if ((typeof wallSecs !== 'number') || !Number.isFinite(wallSecs)) {
    throw Error('wallSecs must be a finite number');
  }

  let isNegative = false;
  if (wallSecs < 0) {
    wallSecs *= -1;
    isNegative = true;
  }

  wallSecs = Math.round(wallSecs);

  let output = '';
  if (isNegative && (wallSecs !== 0)) {
    output += '(-) ';
  }

  const hh = Math.floor(wallSecs / (MINS_PER_HR_ * SECS_PER_MIN_));
  wallSecs -= (MINS_PER_HR_ * SECS_PER_MIN_) * hh;

  const mm = Math.floor(wallSecs / SECS_PER_MIN_);
  wallSecs -= SECS_PER_MIN_ * mm;

  const ss = wallSecs;

  // Output hh only if non-zero. No zero padding.
  if (hh > 0) {
    output += hh;
    output += 'h ';
  }

  // Output mm only if non-zero. Zero pad if needed for 2 digits.
  if ((hh > 0) || (mm > 0)) {
    output += String(mm).padStart(2, '0');
    output += 'm ';
  }

  // Always output ss. Zero pad if needed for 2 digits.
  output += String(ss).padStart(2, '0');
  output += 's';

  return output;
}

/**
 * Returns frame index of closest frame before or exactly equal to the given
 * wallSecs (offset from origin 00:00:00:00).
 *
 * Note that negative wallSecs will yield negative frame indexes.
 * @param {number} wallSecs Time in wall seconds (possibly fractional) offset from
 *     origin 00:00:00:00.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {number} Integer frame index <= given wallSecs.
 * @customFunction
 */
function WALL_SECS_TO_FRAMEIDX_LEFT(wallSecs, frameRate, dropType) {
  const tcStd = parseTcStd_(frameRate, dropType);

  const fractionalFrameIdx = wallSecsToFractionalFrameIdx_(wallSecs, tcStd);
  return Math.floor(fractionalFrameIdx);
}

/**
 * Returns frame index of closest frame after or exactly equal to the given
 * wallSecs (offset from origin 00:00:00:00).
 * 
 * Note that negative wallSecs will yield negative frame indexes.
 * @param {number} wallSecs Time in wall seconds (possibly fractional) offset from
 *     origin 00:00:00:00.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {number} Integer frame index >= given wallSecs.
 * @customFunction
 */
function WALL_SECS_TO_FRAMEIDX_RIGHT(wallSecs, frameRate, dropType) {
  const tcStd = parseTcStd_(frameRate, dropType);

  const fractionalFrameIdx = wallSecsToFractionalFrameIdx_(wallSecs, tcStd);
  return Math.ceil(fractionalFrameIdx);
}

/**
 * @param {number} wallSecs 
 * @param {TimecodeStandard} tcStd
 * @return {number}
 * @private
 */
function wallSecsToFractionalFrameIdx_(wallSecs, tcStd) {
  if (!Number.isFinite(wallSecs)) {
    throw Error('wallSecs must be a finite number: ' + wallSecs);
  }

  return wallSecs * tcStd.frames / tcStd.perWallSecs;
}

/**
 * Returns timecode string of closest frame before or exactly equal to the given
 * wallSecs (offset from origin 00:00:00:00).
 *
 * Note that negative wallSecs are NOT supported.
 * @param {number} wallSecs Time in wall seconds (possibly fractional) offset from
 *     origin 00:00:00:00.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {string} Timecode of nearest frame <= wallSecs.
 * @customFunction
 */
function WALL_SECS_TO_TC_LEFT(wallSecs, frameRate, dropType = 'non-drop') {
  const tcStd = parseTcStd_(frameRate, dropType);

  const fractionalFrameIdx = wallSecsToFractionalFrameIdx_(wallSecs, tcStd);
  const frameIdx = Math.floor(fractionalFrameIdx);
  return frameIdxToTc_(frameIdx, tcStd);
}

/**
 * Returns timecode string of closest frame after or exactly equal to the given
 * wallSecs (offset from origin 00:00:00:00).
 *
 * Note that negative wallSecs are NOT supported.
 * @param {number} wallSecs Time in wall seconds (possibly fractional) offset from
 *     origin 00:00:00:00.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {string} Timecode of nearest frame >= wallSecs.
 * @customFunction
 */
function WALL_SECS_TO_TC_RIGHT(wallSecs, frameRate, dropType = 'non-drop') {
  const tcStd = parseTcStd_(frameRate, dropType);

  const fractionalFrameIdx = wallSecsToFractionalFrameIdx_(wallSecs, tcStd);
  const frameIdx = Math.ceil(fractionalFrameIdx);
  return frameIdxToTc_(frameIdx, tcStd);
}

/**
 * Returns timecode string for given frame index.
 * 
 * Note that negative frameIdx values are NOT supported.
 * @param {number} frameIdx The 0-based frame index.
 * @param {string} frameRate Frame rate as a plain text string, with exactly 2 or 3
 *     decimal digits of precision after the period (e.g. "23.976" or "24.00").
 * @param {string} dropType [OPTIONAL] "drop" or "non-drop" (the default).
 * @return {string} Timecode of given frameIdx.
 * @customFunction
 */
function FRAMEIDX_TO_TC(frameIdx, frameRate, dropType = 'non-drop') {
  const tcStd = parseTcStd_(frameRate, dropType);
  return frameIdxToTc_(frameIdx, tcStd);
}

/**
 * @param {number} frameIdx 
 * @param {TimecodeStandard} tcStd
 * @return {string}
 * @private
 */
function frameIdxToTc_(frameIdx, tcStd) {
  if (frameIdx < 0) {
    throw Error('negative timecode values are not supported');
  }

  const framesPerMin = tcStd.intFps * SECS_PER_MIN_;
  const framesPerHr = framesPerMin * MINS_PER_HR_;

  // If this is a drop frame standard, adjust for any dropped frames.
  let framesRemaining = frameIdx + framesDroppedBeforeFrameIdx_(frameIdx, tcStd);

  const h = Math.floor(framesRemaining / framesPerHr);
  framesRemaining -= h * framesPerHr;

  const m = Math.floor(framesRemaining / framesPerMin);
  framesRemaining -= m * framesPerMin;

  const s = Math.floor(framesRemaining / tcStd.intFps);
  framesRemaining -= s * tcStd.intFps;

  const f = framesRemaining;

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  const ff = String(f).padStart(2, '0');

  // TODO: Optionally support ';' separator for drop frame standards, if this
  // feature is sufficiently requested.
  return `${hh}:${mm}:${ss}:${ff}`;
}

/**
 * @param {number} frameIdx
 * @param {TimecodeStandard} tcStd
 * @return {number}
 * @private
 */
function framesDroppedBeforeFrameIdx_(frameIdx, tcStd) {
  if (tcStd.dropFramesPer10Mins === 0) {
    return 0;
  }

  const framesPerNonDropMin = tcStd.intFps * SECS_PER_MIN_;
  const framesPerDroppedBlock = framesPerDroppedBlock_(tcStd)
  const framesPerDropMin = framesPerNonDropMin - framesPerDroppedBlock;

  // Count # of full blocks of 10 minutes (of timecode, not wall time).
  const framesPer10Mins = 10 * framesPerNonDropMin - tcStd.dropFramesPer10Mins;

  let framesRemaining = frameIdx;
  const numComplete10MinBlocks = Math.floor(framesRemaining / framesPer10Mins);
  framesRemaining -= framesPer10Mins * numComplete10MinBlocks;

  let numDroppedFrames = numComplete10MinBlocks * tcStd.dropFramesPer10Mins;

  if (framesRemaining >= framesPerNonDropMin) {
    // First minute of this 10 minute block has no dropped frames.
    framesRemaining -= framesPerNonDropMin;

    // Each complete drop minute plus the current minute drops one block of frames.
    const numCompleteDropMins = Math.floor(framesRemaining / framesPerDropMin);    
    numDroppedFrames += (numCompleteDropMins + 1) * framesPerDroppedBlock;
  }

  return numDroppedFrames;
}

// For command-line testing:
if ((typeof module !== 'undefined') && module.exports) {
  module.exports = {
    FRAMEIDX_TO_TC: FRAMEIDX_TO_TC,
    FRAMEIDX_TO_WALL_SECS: FRAMEIDX_TO_WALL_SECS,
    TC_ERROR: TC_ERROR,
    TC_TO_FRAMEIDX: TC_TO_FRAMEIDX,
    TC_TO_WALL_SECS: TC_TO_WALL_SECS,
    WALL_SECS_BETWEEN_TCS: WALL_SECS_BETWEEN_TCS,
    WALL_SECS_TO_DURSTR: WALL_SECS_TO_DURSTR,
    WALL_SECS_TO_FRAMEIDX_LEFT: WALL_SECS_TO_FRAMEIDX_LEFT,
    WALL_SECS_TO_FRAMEIDX_RIGHT: WALL_SECS_TO_FRAMEIDX_RIGHT,
    WALL_SECS_TO_TC_LEFT: WALL_SECS_TO_TC_LEFT,
    WALL_SECS_TO_TC_RIGHT: WALL_SECS_TO_TC_RIGHT,
  };
}

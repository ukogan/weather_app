/**
 * Solfege Trainer - Fixed Do vs Movable Do
 * An educational app to help understand the difference between solfege systems
 */

// ============================================================================
// MUSIC THEORY DATA
// ============================================================================

// Note frequencies (A4 = 440Hz standard tuning)
const NOTE_FREQUENCIES = {
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
  'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
  'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
  'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00,
  'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50
};

// Fixed Do mapping - each pitch has a fixed solfege name
const FIXED_DO = {
  'C': 'Do', 'C#': 'Di', 'Db': 'Ra',
  'D': 'Re', 'D#': 'Ri', 'Eb': 'Me',
  'E': 'Mi', 'E#': 'Mi', 'Fb': 'Mi',
  'F': 'Fa', 'F#': 'Fi', 'Gb': 'Se',
  'G': 'Sol', 'G#': 'Si', 'Ab': 'Le',
  'A': 'La', 'A#': 'Li', 'Bb': 'Te',
  'B': 'Ti', 'B#': 'Ti', 'Cb': 'Ti'
};

// Scale degrees for movable do (major scale)
const MOVABLE_DO_MAJOR = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
// Scale degrees for movable do (minor scale - la-based)
const MOVABLE_DO_MINOR = ['La', 'Ti', 'Do', 'Re', 'Mi', 'Fa', 'Sol'];

// All chromatic notes in order
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Major scale intervals (in semitones from root)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
// Minor scale intervals (in semitones from root)
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

// ============================================================================
// CLASSICAL MUSIC THEMES
// ============================================================================

const CLASSICAL_THEMES = {
  'ode-to-joy': {
    name: 'Ode to Joy',
    composer: 'Beethoven',
    key: 'D',
    mode: 'major',
    // Notes as [pitch, duration in beats]
    notes: [
      ['F#4', 1], ['F#4', 1], ['G4', 1], ['A4', 1],
      ['A4', 1], ['G4', 1], ['F#4', 1], ['E4', 1],
      ['D4', 1], ['D4', 1], ['E4', 1], ['F#4', 1],
      ['F#4', 1.5], ['E4', 0.5], ['E4', 2],
      ['F#4', 1], ['F#4', 1], ['G4', 1], ['A4', 1],
      ['A4', 1], ['G4', 1], ['F#4', 1], ['E4', 1],
      ['D4', 1], ['D4', 1], ['E4', 1], ['F#4', 1],
      ['E4', 1.5], ['D4', 0.5], ['D4', 2]
    ]
  },
  'twinkle': {
    name: 'Twinkle Twinkle Little Star',
    composer: 'Traditional (Mozart Variations)',
    key: 'C',
    mode: 'major',
    notes: [
      ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1],
      ['A4', 1], ['A4', 1], ['G4', 2],
      ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1],
      ['D4', 1], ['D4', 1], ['C4', 2],
      ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1],
      ['E4', 1], ['E4', 1], ['D4', 2],
      ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1],
      ['E4', 1], ['E4', 1], ['D4', 2],
      ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1],
      ['A4', 1], ['A4', 1], ['G4', 2],
      ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1],
      ['D4', 1], ['D4', 1], ['C4', 2]
    ]
  },
  'canon': {
    name: 'Canon in D',
    composer: 'Pachelbel',
    key: 'D',
    mode: 'major',
    notes: [
      ['F#5', 1], ['E5', 1], ['D5', 1], ['C#5', 1],
      ['B4', 1], ['A4', 1], ['B4', 1], ['C#5', 1],
      ['D5', 1], ['C#5', 1], ['B4', 1], ['A4', 1],
      ['G4', 1], ['F#4', 1], ['G4', 1], ['E4', 1],
      ['D4', 0.5], ['F#4', 0.5], ['A4', 0.5], ['G4', 0.5],
      ['F#4', 0.5], ['D4', 0.5], ['F#4', 0.5], ['E4', 0.5],
      ['D4', 1], ['B3', 1], ['D4', 1], ['A4', 1],
      ['G4', 1], ['B4', 1], ['A4', 1], ['G4', 1],
      ['F#4', 1], ['D4', 1], ['E4', 1], ['C#5', 1],
      ['D5', 2], ['D5', 2]
    ]
  },
  'eine-kleine': {
    name: 'Eine Kleine Nachtmusik',
    composer: 'Mozart',
    key: 'G',
    mode: 'major',
    notes: [
      ['G4', 0.5], ['REST', 0.25], ['D4', 0.25],
      ['G4', 0.5], ['REST', 0.25], ['D4', 0.25],
      ['G4', 0.25], ['D4', 0.25], ['G4', 0.25], ['B4', 0.25],
      ['D5', 1],
      ['C5', 0.5], ['REST', 0.25], ['A4', 0.25],
      ['C5', 0.5], ['REST', 0.25], ['A4', 0.25],
      ['C5', 0.25], ['A4', 0.25], ['F#4', 0.25], ['A4', 0.25],
      ['D4', 1],
      ['G4', 0.25], ['G4', 0.25], ['G4', 0.25], ['F#4', 0.25],
      ['E4', 0.25], ['D4', 0.25], ['E4', 0.25], ['F#4', 0.25],
      ['G4', 0.25], ['G4', 0.25], ['G4', 0.25], ['F#4', 0.25],
      ['E4', 0.25], ['D4', 0.25], ['E4', 0.25], ['F#4', 0.25],
      ['G4', 0.5], ['B4', 0.5], ['D5', 1]
    ]
  },
  'fur-elise': {
    name: 'Fur Elise',
    composer: 'Beethoven',
    key: 'A',
    mode: 'minor',
    notes: [
      ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['D#5', 0.5],
      ['E5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5],
      ['A4', 1], ['REST', 0.5],
      ['C4', 0.5], ['E4', 0.5], ['A4', 0.5],
      ['B4', 1], ['REST', 0.5],
      ['E4', 0.5], ['G#4', 0.5], ['B4', 0.5],
      ['C5', 1], ['REST', 0.5],
      ['E4', 0.5], ['E5', 0.5], ['D#5', 0.5],
      ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['B4', 0.5],
      ['D5', 0.5], ['C5', 0.5],
      ['A4', 1], ['REST', 0.5],
      ['C4', 0.5], ['E4', 0.5], ['A4', 0.5],
      ['B4', 1], ['REST', 0.5],
      ['E4', 0.5], ['C5', 0.5], ['B4', 0.5],
      ['A4', 2]
    ]
  },
  'moonlight': {
    name: 'Moonlight Sonata',
    composer: 'Beethoven',
    key: 'C#',
    mode: 'minor',
    notes: [
      ['G#4', 1], ['C#5', 1], ['E5', 1],
      ['G#4', 1], ['C#5', 1], ['E5', 1],
      ['G#4', 1], ['C#5', 1], ['E5', 1],
      ['G#4', 1], ['C#5', 1], ['E5', 1],
      ['A4', 1], ['C#5', 1], ['E5', 1],
      ['A4', 1], ['C#5', 1], ['E5', 1],
      ['G#4', 1], ['B4', 1], ['E5', 1],
      ['G#4', 1], ['B4', 1], ['E5', 1],
      ['G#4', 1], ['C#5', 1], ['E5', 1],
      ['G#5', 2], ['E5', 1],
      ['C#5', 3]
    ]
  },
  'spring': {
    name: 'Spring (Four Seasons)',
    composer: 'Vivaldi',
    key: 'E',
    mode: 'major',
    notes: [
      ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['REST', 0.5],
      ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['REST', 0.5],
      ['E5', 0.5], ['F#5', 0.5], ['G#5', 0.5], ['G#5', 0.5],
      ['F#5', 0.5], ['E5', 0.5], ['F#5', 1],
      ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['REST', 0.5],
      ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['REST', 0.5],
      ['E5', 0.5], ['F#5', 0.5], ['G#5', 0.5], ['G#5', 0.5],
      ['F#5', 0.5], ['E5', 0.5], ['E5', 1],
      ['D#5', 0.5], ['D#5', 0.5], ['D#5', 0.5], ['E5', 0.5],
      ['F#5', 1], ['E5', 1],
      ['D#5', 0.5], ['D#5', 0.5], ['D#5', 0.5], ['E5', 0.5],
      ['F#5', 0.5], ['E5', 0.5], ['D#5', 0.5], ['C#5', 0.5],
      ['B4', 2]
    ]
  },
  'bach-minuet': {
    name: 'Minuet in G',
    composer: 'Bach',
    key: 'G',
    mode: 'major',
    notes: [
      ['D5', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5],
      ['D5', 1], ['G4', 1], ['G4', 1],
      ['E5', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5],
      ['G5', 1], ['G4', 1], ['G4', 1],
      ['C5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5],
      ['B4', 1], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5],
      ['F#4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 0.5],
      ['A4', 3]
    ]
  }
};

// ============================================================================
// APP STATE
// ============================================================================

let audioContext = null;
let isPlaying = false;
let currentNoteIndex = 0;
let playbackTimeout = null;
let currentTheme = null;

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const themeSelect = document.getElementById('theme-select');
const tempoSlider = document.getElementById('tempo-slider');
const tempoValue = document.getElementById('tempo-value');
const speakFixedCheckbox = document.getElementById('speak-fixed');
const speakMovableCheckbox = document.getElementById('speak-movable');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const currentKeyDisplay = document.getElementById('current-key');
const currentNoteDisplay = document.getElementById('current-note');
const pitchDisplay = document.getElementById('pitch-display');
const fixedDoDisplay = document.getElementById('fixed-do-display');
const movableDoDisplay = document.getElementById('movable-do-display');
const noteHistory = document.getElementById('note-history');
const pianoContainer = document.getElementById('piano');

// ============================================================================
// AUDIO FUNCTIONS
// ============================================================================

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playNote(frequency, duration) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Use a pleasant piano-like waveform
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;

  // ADSR envelope for more natural sound
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.5, now + 0.02); // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.1); // Decay
  gainNode.gain.setValueAtTime(0.3, now + duration - 0.1); // Sustain
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release

  oscillator.start(now);
  oscillator.stop(now + duration);
}

// ============================================================================
// SPEECH SYNTHESIS
// ============================================================================

function speakSolfege(fixedDo, movableDo) {
  if (!('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const toSpeak = [];

  if (speakFixedCheckbox.checked && fixedDo) {
    toSpeak.push(fixedDo);
  }
  if (speakMovableCheckbox.checked && movableDo && movableDo !== fixedDo) {
    toSpeak.push(movableDo);
  }

  if (toSpeak.length > 0) {
    const utterance = new SpeechSynthesisUtterance(toSpeak.join(', '));
    utterance.rate = 1.2;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  }
}

// ============================================================================
// MUSIC THEORY FUNCTIONS
// ============================================================================

function getNoteName(noteWithOctave) {
  return noteWithOctave.replace(/\d+$/, '');
}

function getNoteOctave(noteWithOctave) {
  const match = noteWithOctave.match(/\d+$/);
  return match ? parseInt(match[0]) : 4;
}

function getFixedDo(noteName) {
  // Handle sharps/flats
  const baseNote = noteName.replace('#', '').replace('b', '');
  if (noteName.includes('#')) {
    return FIXED_DO[baseNote + '#'] || FIXED_DO[baseNote];
  }
  if (noteName.includes('b')) {
    return FIXED_DO[baseNote + 'b'] || FIXED_DO[baseNote];
  }
  return FIXED_DO[noteName];
}

function getMovableDo(noteName, keyRoot, mode) {
  // Get the index of the note in chromatic scale
  let noteIndex = CHROMATIC_NOTES.indexOf(noteName);
  if (noteIndex === -1) {
    // Handle sharps - convert to base note index + 1
    const baseNote = noteName.replace('#', '');
    noteIndex = (CHROMATIC_NOTES.indexOf(baseNote) + 1) % 12;
  }

  // Get the index of the key root
  let rootIndex = CHROMATIC_NOTES.indexOf(keyRoot);
  if (rootIndex === -1) {
    const baseRoot = keyRoot.replace('#', '');
    rootIndex = (CHROMATIC_NOTES.indexOf(baseRoot) + 1) % 12;
  }

  // Calculate semitones from root
  let semitones = (noteIndex - rootIndex + 12) % 12;

  // Get scale intervals based on mode
  const scaleIntervals = mode === 'minor' ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;
  const scaleDegrees = mode === 'minor' ? MOVABLE_DO_MINOR : MOVABLE_DO_MAJOR;

  // Find the closest scale degree
  let closestDegree = 0;
  let minDiff = 12;

  for (let i = 0; i < scaleIntervals.length; i++) {
    const diff = Math.abs(scaleIntervals[i] - semitones);
    if (diff < minDiff) {
      minDiff = diff;
      closestDegree = i;
    }
    if (scaleIntervals[i] === semitones) {
      return scaleDegrees[i];
    }
  }

  // For chromatic notes, add accidental
  const baseDegree = scaleDegrees[closestDegree];
  if (semitones > scaleIntervals[closestDegree]) {
    // Sharped version - modify vowel
    return baseDegree.replace(/[aeiou]$/, 'i');
  } else {
    // Flatted version
    return baseDegree.replace(/[aeiou]$/, 'e');
  }
}

// ============================================================================
// PIANO KEYBOARD
// ============================================================================

function buildPiano() {
  pianoContainer.innerHTML = '';

  // Build 2 octaves (C4 to C6)
  const startOctave = 4;
  const endOctave = 5;

  const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const blackNotePositions = {
    'C': 'C#', 'D': 'D#', 'F': 'F#', 'G': 'G#', 'A': 'A#'
  };

  let whiteKeyIndex = 0;

  for (let octave = startOctave; octave <= endOctave; octave++) {
    for (const note of whiteNotes) {
      if (octave === endOctave && note !== 'C') break; // Only C6

      const noteWithOctave = note + octave;

      // White key
      const whiteKey = document.createElement('div');
      whiteKey.className = 'key key--white';
      whiteKey.dataset.note = noteWithOctave;
      whiteKey.innerHTML = `<span class="key__label">${note}</span>`;
      whiteKey.addEventListener('click', () => playAndDisplayNote(noteWithOctave));
      pianoContainer.appendChild(whiteKey);

      // Black key (if exists)
      if (blackNotePositions[note]) {
        const blackNote = blackNotePositions[note] + octave;
        const blackKey = document.createElement('div');
        blackKey.className = 'key key--black';
        blackKey.dataset.note = blackNote;
        blackKey.style.left = `${whiteKeyIndex * 42 + 28}px`;
        blackKey.innerHTML = `<span class="key__label">${blackNotePositions[note]}</span>`;
        blackKey.addEventListener('click', () => playAndDisplayNote(blackNote));
        pianoContainer.appendChild(blackKey);
      }

      whiteKeyIndex++;
    }
  }
}

function highlightPianoKey(noteWithOctave, highlight = true) {
  // Remove all highlights
  document.querySelectorAll('.key.active').forEach(key => {
    key.classList.remove('active');
  });

  if (highlight && noteWithOctave && noteWithOctave !== 'REST') {
    const key = document.querySelector(`.key[data-note="${noteWithOctave}"]`);
    if (key) {
      key.classList.add('active');
    }
  }
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

function updateNoteDisplay(noteWithOctave, theme) {
  if (!noteWithOctave || noteWithOctave === 'REST') {
    pitchDisplay.textContent = '--';
    fixedDoDisplay.textContent = '--';
    movableDoDisplay.textContent = '--';
    currentNoteDisplay.textContent = '--';
    return;
  }

  const noteName = getNoteName(noteWithOctave);
  const fixedDo = getFixedDo(noteName);
  const movableDo = getMovableDo(noteName, theme.key, theme.mode);

  pitchDisplay.textContent = noteWithOctave;
  fixedDoDisplay.textContent = fixedDo;
  movableDoDisplay.textContent = movableDo;
  currentNoteDisplay.textContent = noteWithOctave;

  // Add animation
  pitchDisplay.classList.add('playing');
  fixedDoDisplay.classList.add('playing');
  movableDoDisplay.classList.add('playing');

  setTimeout(() => {
    pitchDisplay.classList.remove('playing');
    fixedDoDisplay.classList.remove('playing');
    movableDoDisplay.classList.remove('playing');
  }, 300);

  return { fixedDo, movableDo };
}

function addNoteToHistory(noteWithOctave, theme, isCurrent = false) {
  if (noteWithOctave === 'REST') return;

  // Clear placeholder
  const placeholder = noteHistory.querySelector('.history-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  const noteName = getNoteName(noteWithOctave);
  const fixedDo = getFixedDo(noteName);
  const movableDo = getMovableDo(noteName, theme.key, theme.mode);

  const noteElement = document.createElement('div');
  noteElement.className = 'history-note' + (isCurrent ? ' current' : '');
  noteElement.innerHTML = `
    <span class="history-note__pitch">${noteWithOctave}</span>
    <span class="history-note__fixed">${fixedDo}</span>
    <span class="history-note__movable">${movableDo}</span>
  `;

  noteHistory.appendChild(noteElement);
  noteHistory.scrollTop = noteHistory.scrollHeight;
}

function clearHistory() {
  noteHistory.innerHTML = '<p class="history-placeholder">Play a theme to see the notes...</p>';
}

function updateHistoryHighlight(index) {
  document.querySelectorAll('.history-note.current').forEach(note => {
    note.classList.remove('current');
  });

  const notes = document.querySelectorAll('.history-note');
  if (notes[index]) {
    notes[index].classList.add('current');
    notes[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function updateKeyDisplay(theme) {
  const modeSymbol = theme.mode === 'minor' ? 'm' : '';
  currentKeyDisplay.textContent = `Key: ${theme.key}${modeSymbol} ${theme.mode === 'minor' ? 'Minor' : 'Major'}`;
}

// ============================================================================
// PLAYBACK FUNCTIONS
// ============================================================================

function playAndDisplayNote(noteWithOctave) {
  initAudio();

  const frequency = NOTE_FREQUENCIES[noteWithOctave];
  if (frequency) {
    playNote(frequency, 0.5);
    highlightPianoKey(noteWithOctave);

    // Get current theme for solfege calculation
    const themeKey = themeSelect.value;
    const theme = CLASSICAL_THEMES[themeKey];
    const solfege = updateNoteDisplay(noteWithOctave, theme);

    if (solfege) {
      speakSolfege(solfege.fixedDo, solfege.movableDo);
    }

    setTimeout(() => highlightPianoKey(null, false), 400);
  }
}

function playTheme() {
  if (isPlaying) return;

  initAudio();

  const themeKey = themeSelect.value;
  currentTheme = CLASSICAL_THEMES[themeKey];

  if (!currentTheme) return;

  isPlaying = true;
  currentNoteIndex = 0;

  // Update UI
  playBtn.disabled = true;
  stopBtn.disabled = false;
  clearHistory();
  updateKeyDisplay(currentTheme);

  // Pre-populate history with all notes (without current highlight)
  currentTheme.notes.forEach(([note]) => {
    if (note !== 'REST') {
      addNoteToHistory(note, currentTheme, false);
    }
  });

  playNextNote();
}

function playNextNote() {
  if (!isPlaying || currentNoteIndex >= currentTheme.notes.length) {
    stopPlayback();
    return;
  }

  const [noteWithOctave, duration] = currentTheme.notes[currentNoteIndex];
  const tempo = parseInt(tempoSlider.value);
  const beatDuration = 60000 / tempo; // milliseconds per beat

  if (noteWithOctave !== 'REST') {
    // Play the note
    const frequency = NOTE_FREQUENCIES[noteWithOctave];
    if (frequency) {
      playNote(frequency, (duration * beatDuration) / 1000);
    }

    // Update displays
    highlightPianoKey(noteWithOctave);
    const solfege = updateNoteDisplay(noteWithOctave, currentTheme);

    // Update history highlight
    // Count non-REST notes before current index
    let historyIndex = 0;
    for (let i = 0; i < currentNoteIndex; i++) {
      if (currentTheme.notes[i][0] !== 'REST') historyIndex++;
    }
    updateHistoryHighlight(historyIndex);

    // Speak solfege
    if (solfege) {
      speakSolfege(solfege.fixedDo, solfege.movableDo);
    }
  }

  currentNoteIndex++;

  // Schedule next note
  playbackTimeout = setTimeout(() => {
    highlightPianoKey(null, false);
    playNextNote();
  }, duration * beatDuration);
}

function stopPlayback() {
  isPlaying = false;
  currentNoteIndex = 0;

  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }

  // Stop any ongoing speech
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }

  // Update UI
  playBtn.disabled = false;
  stopBtn.disabled = true;
  highlightPianoKey(null, false);

  // Clear current highlight
  document.querySelectorAll('.history-note.current').forEach(note => {
    note.classList.remove('current');
  });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

playBtn.addEventListener('click', playTheme);
stopBtn.addEventListener('click', stopPlayback);

tempoSlider.addEventListener('input', () => {
  tempoValue.textContent = tempoSlider.value;
});

themeSelect.addEventListener('change', () => {
  stopPlayback();
  clearHistory();
  const theme = CLASSICAL_THEMES[themeSelect.value];
  updateKeyDisplay(theme);
  updateNoteDisplay(null, theme);
});

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  buildPiano();

  // Set initial key display
  const initialTheme = CLASSICAL_THEMES[themeSelect.value];
  updateKeyDisplay(initialTheme);

  // Handle page visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying) {
      stopPlayback();
    }
  });
}

// Start the app
init();

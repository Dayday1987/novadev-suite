# Throttle Up - Sound Assets

## Required Sound Files

Add these sound files to improve game audio quality:

### 1. `engine-rev.mp3`
- **Description**: Motorcycle engine revving sound
- **Duration**: 1-2 seconds, loopable
- **Use**: Plays while holding wheelie
- **Format**: MP3, 128kbps
- **Sources**: 
  - [Freesound.org](https://freesound.org/search/?q=motorcycle+engine)
  - [Zapsplat.com](https://www.zapsplat.com)

### 2. `crash.mp3`
- **Description**: Impact/crash sound effect
- **Duration**: 0.5-1 second
- **Use**: Plays when hitting obstacle
- **Format**: MP3, 128kbps

### 3. `coin-collect.mp3`
- **Description**: Coin pickup sound (bright, positive)
- **Duration**: 0.3-0.5 seconds
- **Use**: Plays when collecting coins
- **Format**: MP3, 128kbps

### 4. `countdown-beep.mp3` (Optional)
- **Description**: Countdown beep for race start
- **Duration**: 0.2 seconds
- **Use**: Plays during 3-2-1 countdown
- **Format**: MP3, 128kbps

## Current Implementation

The game currently uses Web Audio API (oscillators) to generate sounds programmatically. Once you add these MP3 files, update `app.js` to load and play them instead.

## License

Ensure all sound files are:
- Royalty-free
- Licensed for commercial use
- Properly attributed if required

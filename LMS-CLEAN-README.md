# LMS Clean Interface

A simple CSS solution to remove "Complete previous lesson to unlock" messages from LMS course players while keeping lesson titles visible.

## Problem
LMS interfaces often show distracting lock messages that clutter the course navigation, making it harder to see the actual lesson structure.

## Solution
This CSS stylesheet hides unnecessary lock messages and icons while preserving:
- Lesson titles and numbers
- Module structure
- Course navigation

## Installation

### Option 1: Browser Extension (Recommended)
1. Install a CSS injection extension:
   - **Chrome/Edge**: [Stylus](https://chrome.google.com/webstore/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne)
   - **Firefox**: [Stylus](https://addons.mozilla.org/en-US/firefox/addon/styl-us/)
   - **Safari**: [Cascadea](https://cascadea.app/)

2. Create a new style for your LMS domain
3. Copy the contents of `lms-clean.css`
4. Save and enable the style

### Option 2: Tampermonkey Script
```javascript
// ==UserScript==
// @name         LMS Clean Interface
// @match        https://your-lms-domain.com/*
// @grant        GM_addStyle
// ==/UserScript==

GM_addStyle(`
  /* Paste the CSS here */
`);
```

### Option 3: Custom LMS Theme
If you have admin access, add the CSS to your LMS's custom theme settings.

## Features
- ✅ Hides "Complete previous lesson" messages
- ✅ Removes lock icons
- ✅ Restores full opacity to locked items
- ✅ Preserves lesson titles and numbers
- ✅ Cleans up extra spacing
- ✅ Optional: Makes locked lessons clickable

## Customization
Comment out any rules you don't want to apply. For example, to keep lock icons visible, remove the lock icon hiding section.

## Compatibility
Tested with common LMS platforms. May need minor adjustments for specific systems.

## License
MIT
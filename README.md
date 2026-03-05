# chat-branch-visualizer-mvp

MVP Chrome extension for **conversation branch visualization + fast hover preview** on ChatGPT / Claude pages.

## What this MVP does

- Builds a baseline linear conversation node list from visible messages
- Lets you create manual branches from any node (`+Branch`)
- Shows a simple tree in a floating side panel
- **Hover node = temporary preview (quick switch)**
- **Click node = pin as active node**
- `Esc` returns from preview to active node

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder
5. Open ChatGPT or Claude conversation page

## Usage

- Click **Refresh** to rebuild nodes from current visible chat
- Click `+Branch` near a node to fork from that node
- Hover nodes in panel to preview that depth/branch instantly
- Click a node to set active branch point
- Press `Esc` to cancel preview

## Notes / limitations

- This is a DOM-based MVP; selectors may break when platform UI changes
- Branches are local and stored in `chrome.storage.local`
- Tree layout is list-based for speed; can later swap to React Flow/D3

## Next steps

- Better auto branch detection (edit/regenerate hooks)
- Real graph canvas (React Flow)
- Cross-tab sync and export/import JSON
- Diff view for branch comparison

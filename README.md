# youtube-publish-drafts

This is a fork of [Niedzwiedzw](https://github.com/Niedzwiedzw/youtube-publish-drafts)'s original script, with added features (even more to come) and some performance improvements. 

## Help
If you have any issues, reply to me [on Reddit](https://www.reddit.com/r/javascript/comments/kl0ffl/i_automated_youtubes_bulk_upload_publish_process/) or [open an issue](https://github.com/Th-Underscore/youtube-publish-drafts/issues)!

## About
Automatically publish all your draft videos using JavaScript!

### Features
- Publish all your video drafts
  - Schedule publishing in intervals **(New!)**
- Sort your playlists (experimental)

![old demo](youtube-publisher-demo.gif)

## How to Use This
(if you were to do that, which I'm pretty sure is against YouTube's Terms of Service, so don't do that)

1. Go to YouTube Studio's "Content"  page
2. Press F12 (or Ctrl+Shift+I, or right-click and select "Inspect" / "Inspect Element")
3. Paste the entire content of the [`youtube-publish-drafts.js`](https://raw.githubusercontent.com/Th-Underscore/youtube-publish-drafts/refs/heads/master/youtube-publish-drafts.js) file into the Console input
4. Make any desired changes at the top of the text — marked `PUBLISH CONFIG` (visibility/schedule, made for kids, etc.) — and press Enter
5. Get a snack! This might take a couple minutes
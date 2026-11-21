# Figma from code

Rebuilds the screens on Figma page "7 · Editable frames" from the live prototype, so the Figma frames match the code. Each element becomes an auto layout frame named after its class, with the CSS spacing, padding, alignment, colours, borders, shadows and text styles. Icons become components in "Icons from code". Images come from the image library on the page.

## What each file does

| File | Job |
|---|---|
| `grab_all.py` | Opens each state of the live site in Chrome (Playwright) and saves its layout to `states/KEY.json`, plus a PNG for comparison |
| `extract.js` | Runs inside the page: reads boxes, flex and grid settings, padding, colours, text, SVG icons and images |
| `select_fixes.js` | Picks the "Select" control inside each suggestion card by its tag (used for the duplicate-ad states) |
| `prep.py` | Turns a capture into a Figma spec: auto layout direction, gaps, padding, fill, hug or fixed sizing, margins |
| `process.py` | Runs `prep.py` for the keys you pass and packs each spec with the builder into `states/KEY.payload.png` |
| `pack.py`, `mkpayload_lib.py` | Pack the payload as a grayscale PNG, so it can travel through the Figma image upload |
| `build.js` | The Figma builder: creates the frames, text and icon instances from a spec |
| `loader.js` | The script to run in Figma (use_figma or a plugin): unpacks a payload and rebuilds one frame in place |
| `lib.json` | Image library slot names mapped to Figma image hashes |
| `targets.json` | State key mapped to the Figma frame it rebuilds |
| `up.sh` | Posts a payload PNG to a Figma upload URL and prints the image hash and the node it created |

## Redo a screen after a code change

1. `python3 grab_all.py a02` (or a comma-separated list; no argument captures every state). Set `CHROME` if Chrome isn't at `/usr/bin/google-chrome`.
2. `python3 process.py a02`
3. Get an upload URL with the Figma MCP `upload_assets` (current page `7686:2`), then `bash up.sh URL states/a02.payload.png`.
4. In `loader.js`, fill in the hash, the holder node and the target from `targets.json`, and run it with `use_figma`. The frame keeps its ID, name and component, so the flow pages update too.
5. Delete the holder node once the frame looks right. Its image is what the loader reads, so keep it until then.

## Known limits

- a09 and a10 show the prototype's mapped result for "Make the product bigger". Live image generation needs the Gemini key, so the capture swaps in that image.
- Text in Figma can be up to 1 px wider or narrower than in Chrome.
- Line heights are rounded to whole pixels, because Figma rounds an auto-height text box up to a whole pixel.

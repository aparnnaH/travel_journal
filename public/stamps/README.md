# Passport Stamp Assets

Drop external country stamp artwork into `public/stamps/countries`.

Recommended country asset settings:

- File name: `{stampId}.svg` or `{stampId}.png`
- Canvas: 1024 x 1024
- Background: transparent
- Style: imperfect ink, visible wear, strong silhouette, no baked paper rectangle
- Metadata: update `src/data/stamps/countries.ts` if the asset path, prompt hint, or visual treatment changes

Shared overlay textures live in `public/stamps/textures` and are composed by the stamp renderer.

Use `AI_ART_PROMPTS.md` for country-by-country prompts when generating replacement center artwork with an external art model.

# Setup

1. Create a public GitHub repository named exactly `ANSHIKA1220`.
2. Copy every file and folder from this package into that repository.
3. Review the LinkedIn, email and résumé links already personalized in `README.md`.
4. Add repository links to LawBridge, UBID and NeuroVision when those repositories are public.
5. Commit and push the files to the `main` branch.
6. Open **Actions → Refresh signal forensics grid → Run workflow**.
7. If the workflow cannot push, open **Settings → Actions → General → Workflow permissions**, select **Read and write permissions**, and run it again.

The workflow also runs daily. It queries GitHub using the repository-provided `GITHUB_TOKEN`; you do not need to create or paste a personal token.

## Local preview

With Node.js 22 or newer installed:

```bash
npm run generate
```

Without a token, the command deliberately creates a representative preview grid. On GitHub Actions, it uses your real contribution calendar.

## Customize colors

Search the SVG and generator files for:

- Cyan: `#00e5ff` or `#00d9ff`
- Magenta: `#ff2bd6`
- Background: `#030712`

## Important

Do not rename `.github/workflows/generate-forensics-grid.yml`. The `.github` folder may appear hidden in some file explorers, but it must be included when uploading or pushing the project.

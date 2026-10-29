# Uploading this profile README

Use your public **zsklav/zsklav** repository. Upload the extracted files with their folders intact:

- `README.md`
- `assets/`
- `.github/`

The stats images already contain a verified public-data snapshot, so they display immediately. Keep `.github/` to refresh those images daily. After uploading, the **Refresh profile stats** workflow also supports **Actions → Refresh profile stats → Run workflow**. The workflow uses GitHub's built-in token; no personal access token or third-party stats host is required.

If the repository has Actions disabled, enable them in its Actions tab. If repository policy prevents the workflow from committing generated files, allow the workflow's declared `contents: write` permission in the repository's Actions settings.

PRs count public pull requests authored by `zsklav`; merged PRs are the merged subset. Stars earned are summed across original public repositories owned by `zsklav`. Language percentages aggregate code bytes across those repositories and exclude forks. The code-size percentages describe repository contents, not proficiency or time spent coding.

The stats refresh script is `.github/scripts/update-stats.mjs`. The normal design builder is not needed by GitHub Actions.

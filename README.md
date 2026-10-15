# Chord Caddy

Single-page guitar reference and songwriting app. Chords, scales, keys,
progressions, a key identifier, and a song library.

Everything the app does works offline. The song library is saved on the
device, and — once the steps below are done — backed up to this repo.

## Deploying

Drag this whole folder onto your existing Netlify site, or connect the repo
to it. Use the **existing** site, not a new one: saved songs are tied to the
exact URL, so a new address means an empty library.

## Turning on song sync

The app never holds a GitHub token. A Netlify function does, server side.

**1. Make a token**

GitHub → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token.

- Repository access: **Only select repositories** → this repo
- Permissions → Repository permissions → **Contents: Read and write**

That is the only permission it needs. Scoped this way the token cannot touch
your other repos.

**2. Add it to Netlify**

Site configuration → Environment variables:

| Variable        | Value                          | Required |
|-----------------|--------------------------------|----------|
| `GITHUB_TOKEN`  | the token from step 1          | yes      |
| `GITHUB_REPO`   | `owner/repo`                   | yes      |
| `GITHUB_PATH`   | defaults to `songs.json`       | no       |
| `GITHUB_BRANCH` | defaults to `main`             | no       |

**3. Redeploy**, open the Songs tab, and tap **Sync now**.

The bar reads "Backed up to GitHub" when it is working, and
"Cloud sync not set up" if the function cannot see its variables.

## How syncing behaves

Local storage is the working copy, so the app stays instant and usable with
no signal. GitHub is the safety net.

- Each song carries a timestamp. On sync, the newer version of a song wins.
- Songs created on different devices are both kept.
- Deleting is recorded with its own timestamp, so a delete on one device does
  not resurrect on the next sync — but a song edited *after* it was deleted
  elsewhere survives.
- Every failure leaves the local copy untouched. Nothing is ever lost to a
  dropped connection.

## Files

    index.html                  the whole app
    icon.png                    home screen icon
    netlify.toml                points Netlify at the functions folder
    netlify/functions/songs.js  reads and writes songs.json via the GitHub API
    songs.json                  created on first sync

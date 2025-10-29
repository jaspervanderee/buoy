# Services Directory

This directory contains individual JSON files for each service on Buoy Bitcoin.

## Structure

Each service is stored in its own file, named with lowercase and hyphens:
- `phoenix.json`
- `aqua.json`
- `bisq.json`
- etc.

## Workflow

### Editing a Service

1. **Edit the individual file** in `data/services/[service-name].json`
2. **Build** the site: `node scripts/build-static.mjs`
3. **Commit** your changes (both the individual file and generated `services.json`)

### How It Works

- **Source files**: `data/services/*.json` (these are what you edit)
- **Generated file**: `data/services.json` (automatically created during build)
- **Build process**: 
  1. `merge-services.mjs` combines all individual files into `services.json`
  2. `build-static.mjs` uses `services.json` to generate HTML pages

### Important Notes

- ✅ **DO edit**: Individual files in `data/services/`
- ❌ **DON'T edit**: `data/services.json` directly (it gets overwritten)
- 📝 The merged `services.json` is gitignored but recreated on every build

## Benefits

- **Easier editing**: Find and edit one service at a time
- **Better git history**: Changes to one service don't affect others
- **Cleaner diffs**: See exactly what changed per service
- **Scalability**: Can grow to 100+ services without issues


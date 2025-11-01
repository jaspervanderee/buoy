# Service JSON Files

This directory contains individual service data files that get merged into `../services.json` during the build process.

## When Adding or Updating a Service JSON File

**📖 Read the comprehensive guide first:**
```
.cursor/rules/populate-service-json.md
```

This guide contains:
- ✅ Standardized IDs and titles for fees, compatibility, and migration sections
- ✅ Trust chip values to use
- ✅ Status values for compatibility tiles
- ✅ Text formatting rules (no em-dashes!)
- ✅ Complete schema patterns

## Quick Start

1. **Use `phoenix.json` as your schema reference** for field structure and nesting
2. **Follow `populate-service-json.md`** for standardized IDs and titles
3. **Extract service-specific facts** from official sources (FAQ, docs, app stores)
4. **Use plain language** throughout—avoid jargon

## Common Mistakes to Avoid

❌ Don't create custom `illustration` fields (handled automatically by build script registry)  
❌ Don't use em-dashes (—) as sentence breaks (use periods instead)  
❌ Don't invent new fee scenario IDs for common scenarios (use standards: `fees-send-lightning`, etc.)  
❌ Don't use technical jargon (say "Pay someone" not "Execute Lightning payment")  
❌ Don't use "Needs setup" for features that work with caveats (use `"works-caveat"` status instead)  

## Build Process

Individual service files here are merged into `../services.json` by:
```bash
npm run build:services
```

This also generates:
- `/services/{service}.html` pages
- Updated search indexes
- Content hashes for cache busting

---

**Need help?** Check the populate guide: `.cursor/rules/populate-service-json.md`

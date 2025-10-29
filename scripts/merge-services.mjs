#!/usr/bin/env node

/**
 * Merge individual service JSON files into data/services.json
 * This script reads all *.json files from data/services/ and combines them into a single array
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

export function mergeServices() {
  const servicesDir = join(rootDir, 'data', 'services');
  const outputPath = join(rootDir, 'data', 'services.json');

  // Read all JSON files from data/services/
  const files = readdirSync(servicesDir)
    .filter(file => file.endsWith('.json'))
    .sort(); // Sort alphabetically for consistent output

  if (files.length === 0) {
    console.warn('⚠ No service files found in data/services/');
    return;
  }

  // Parse each service file
  const services = files.map(file => {
    const filepath = join(servicesDir, file);
    const content = readFileSync(filepath, 'utf8');
    try {
      return JSON.parse(content);
    } catch (err) {
      console.error(`✗ Error parsing ${file}:`, err.message);
      process.exit(1);
    }
  });

  // Write the merged array to services.json
  writeFileSync(outputPath, JSON.stringify(services, null, 2) + '\n', 'utf8');
  
  console.log(`✓ Merged ${services.length} services into data/services.json`);
  return services;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mergeServices();
}


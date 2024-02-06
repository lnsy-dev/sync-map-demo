#!/usr/bin/env node
import fsPromises from 'fs/promises';

async function describeGeoJSON(filePath) {
  try {
    // Read the GeoJSON file
    const data = await fsPromises.readFile(filePath, 'utf8');
    const geoJSON = JSON.parse(data);

    // Check if it's a valid GeoJSON
    if (!geoJSON.type || !geoJSON.features) {
      console.log('The file does not contain valid GeoJSON data.');
      return;
    }

    console.log(`GeoJSON type: ${geoJSON.type}`);
    console.log(`Total features: ${geoJSON.features.length}`);

    // Initialize structures to hold unique geometry types
    const geometryTypes = new Set();

    // Initialize structure to hold property ranges
    const propertyRanges = {};

    // Loop through the features
    geoJSON.features.forEach((feature) => {
      // Record the geometry type
      if (feature.geometry && feature.geometry.type) {
        geometryTypes.add(feature.geometry.type);
      }

      // Loop through the properties and record the ranges
      if (feature.properties) {
        Object.keys(feature.properties).forEach(key => {
          const value = feature.properties[key];
          if (typeof value === 'number') {
            if (!propertyRanges[key]) {
              propertyRanges[key] = { min: value, max: value };
            } else {
              if (value < propertyRanges[key].min) propertyRanges[key].min = value;
              if (value > propertyRanges[key].max) propertyRanges[key].max = value;
            }
          }
        });
      }
    });

    console.log(`Geometry types present: ${Array.from(geometryTypes).join(', ')}`);
    console.log(`Property ranges:`);
    Object.keys(propertyRanges).forEach(key => {
      console.log(`- ${key}: from ${propertyRanges[key].min} to ${propertyRanges[key].max}`);
    });
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
  }
}

// Check for the correct number of arguments
if (process.argv.length !== 3) {
  console.log('Usage: node describe-geojson.js <path_to_geojson_file>');
  process.exit(1);
}

// Get the file path from the command line arguments
const filePath = process.argv[2];
describeGeoJSON(filePath);

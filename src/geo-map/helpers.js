export const ready = (callbackFunction) =>{
  if(document.readyState === 'complete')
    callbackFunction(event)
  else
    document.addEventListener("DOMContentLoaded", callbackFunction)
}

export const getNewID = () => {
  return 'dtrm-xxxxxxxxxxxxxxxx-'
    .replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16)
  }) + Date.now()
}

export const getURLValues = (URL = window.location.href ) =>{
  const search_params = new URLSearchParams(URL)
  let options = {}
  for (const [key, unparsed_value] of search_params) {
    if(key !== window.location.origin + window.location.pathname + '?' ){
      try {
        const value = JSON.parse(decodeURI(unparsed_value))
        options[key] = value
      } catch {
        options[key] = decodeURI(unparsed_value)
      }
    }
  }
  return options
}

export function populateTemplate(dataObject, template) {
  // Get the template content as a string
  const templateContent = template.innerHTML;
  
  // Function to replace placeholders in the template with actual values from the dataObject
  const replacePlaceholders = (templateString, data) => {
    return templateString.replace(/\$\{(\w+)\}/g, (match, key) => {
      return typeof data[key] !== 'undefined' ? data[key] : match;
    });
  };
  
  // Populate the template
  const populatedTemplate = replacePlaceholders(templateContent, dataObject);
  
  return populatedTemplate;
}

export function describeGeoJSON(geoJSON){
  const geometryTypes = new Set();
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

  return { propertyRanges, geometryTypes }
}

export function generateLayerStyle(geoJSONAnalysis) {
  const { propertyRanges, geometryTypes } = geoJSONAnalysis;
  const layerStyles = [];

  geometryTypes.forEach((type) => {
    let layerStyle = {
      id: `${type}-layer`,
      type: getLayerType(type),
      source: 'geojson-data',
      paint: {},
    };

    // Define paint properties based on geometry type
    switch (type) {
      case 'Point':
      case 'MultiPoint':
        layerStyle.paint = {
          'circle-radius': 5, // Default, could be dynamic based on a property
          'circle-color': '#007cbf', // Default, could be dynamic based on a property
          'circle-opacity': 0.8,
        };
        break;
      case 'LineString':
      case 'MultiLineString':
        layerStyle.paint = {
          'line-width': 2, // Default, could be dynamic based on a property
          'line-color': '#007cbf', // Default, could be dynamic based on a property
        };
        break;
      case 'Polygon':
      case 'MultiPolygon':
        layerStyle.paint = {
          'fill-color': '#007cbf', // Default, could be dynamic based on a property
          'fill-opacity': 0.5,
        };
        break;
      // Add other cases as needed
    }

    layerStyles.push(layerStyle);
  });

  return layerStyles;
}

function getLayerType(geometryType) {
  switch (geometryType) {
    case 'Point':
    case 'MultiPoint':
      return 'circle';
    case 'LineString':
    case 'MultiLineString':
      return 'line';
    case 'Polygon':
    case 'MultiPolygon':
      return 'fill';
    // Add other cases as needed
    default:
      return 'circle'; // Default layer type
  }
}

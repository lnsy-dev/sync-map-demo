import 'https://api.mapbox.com/mapbox-gl-js/v2.9.2/mapbox-gl.js';
import 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.0/mapbox-gl-geocoder.min.js';
import { populateTemplate, describeGeoJSON, generateLayerStyle } from './helpers.js';



import { getURLValues, ready } from './helpers.js';

class GeoMapComponent extends HTMLElement {

  connectedCallback() {
    ready(() => this.initialize())
    setTimeout(() => {
      if(!this.initialized){
        this.initialize()
      }
    }, 3333)
  }

  async initialize(){
        if(typeof(mapboxgl) === 'undefined'){
      return console.error('Geo Map component requires Mapbox to work');
    }
    const URLvalues = getURLValues();

    this.access_token = this.getAttribute('accesstoken');
    if(this.access_token === null){
      return console.error('Geo Map component requires a MapBox access token');
    }
    this.removeAttribute('accesstoken');
    mapboxgl.accessToken = this.access_token;

    this.style = getComputedStyle(this);

    this.styleurl = this.getAttribute('styleurl');
    if(this.styleurl === null || this.styleurl === ""){
      console.warn('could not find style url, using the default');
      this.styleurl = 'mapbox://styles/mapbox/streets-v11';
    }
    this.removeAttribute('styleurl');

    this.latitude = this.getAttribute('latitude');
    if(this.latitude === null) this.latitude = 0;
    this.latitude = URLvalues.latitude ? URLvalues.latitude : this.latitude;

    this.longitude = this.getAttribute('longitude');
    if(this.longitude === null) this.longitude = 0;
    this.longitude = URLvalues.longitude ? URLvalues.longitude : this.longitude;

    this.zoom = this.getAttribute('zoom');
    if(this.zoom === null) this.zoom = 1;
    this.zoom = URLvalues.zoom ? URLvalues.zoom : this.zoom;

    this.bearing = this.getAttribute('bearing');
    if(this.bearing === null) this.bearing = 0;
    this.bearing = URLvalues.bearing ? URLvalues.bearing : this.bearing;

    this.pitch = this.getAttribute('pitch');
    if(this.pitch === null) this.pitch = 0;
    this.pitch = URLvalues.pitch ? URLvalues.pitch : this.pitch;

    this.locked = this.getAttribute('locked');
    if(this.locked === null){
      this.locked = false;
    } else {
      this.locked = true;
    };

    this.navigation_control = this.getAttribute('navigation-control');
    if(this.navigation_control === null) this.navigation_control = false;

    this.slideshow = this.getAttribute('slideshow');

    const el = document.createElement('map-container')
    this.appendChild(el)
    this.map = await new mapboxgl.Map({
      container: el, // container ID
      style: this.styleurl, // style URL
      center: [this.longitude, this.latitude],
      zoom: this.zoom,
      bearing: this.bearing,
      projection: 'globe',
      pitch: this.pitch,
      interactive: !this.locked
    })
    this.initialized = true;
    this.map.on('load', () => {this.mapLoaded()})
  }

  initializeGeoCoder(){
    let bbox = this.getAttribute('search-bounds');
    if(bbox !== null){
      bbox = bbox.split(',').map(d => {
        return Number(d.trim());
      });
    }
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      zoom: 18,
      marker: false,
      bbox:bbox,
      placeholder: 'Search for an Address'
    })
    this.map.addControl( geocoder )
  }

  initializeGeoLocate(){
    const geolocate = new mapboxgl.GeolocateControl({
      showAccuracy: false,
      showUserLocation: false
    });
    this.map.addControl(geolocate);
  }

  initializeNavigationControl(){
    const nav_control = new mapboxgl.NavigationControl({
      visualizePitch: true
    })
    this.map.addControl(nav_control);
  }

  handleMoveEnd(e){
    let coords = this.map.getCenter();
    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();
    this.setAttribute('latitude', coords.lat);
    this.setAttribute('longitude', coords.lng);
    this.setAttribute('zoom', zoom);

    this.handleZoom(zoom);
    this.dispatchEvent(
      new CustomEvent('MAP MOVED', 
        {
          detail: {
            coords,
            bounds,
            zoom
          }
        }
      )
    );
  }

  handleZoom(zoom = 0){
    let mid_zoom_breakpoint = 15;
    let far_zoom_breakpoint = 10; 
    const zoom_breakpoints = this.getAttribute('zoom-breakpoints');
    if(zoom_breakpoints !== null){
      [mid_zoom_breakpoint, far_zoom_breakpoint] = zoom_breakpoints.split(',').map(n => Number(n));
    }
    if(zoom < far_zoom_breakpoint){
      this.classList.add('far');
      this.classList.remove('middle');
      this.classList.remove('near');
    } else if(zoom >= far_zoom_breakpoint && zoom <= mid_zoom_breakpoint){
      this.classList.add('middle')
      this.classList.remove('far')
      this.classList.remove('near')
    } else {
      this.classList.add('near')
      this.classList.remove('middle')
      this.classList.remove('far')
    }
  }

  /*
    
    Show Popup

   */
  showPopup(content, coordinates){
    const popup = new mapboxgl.Popup({ 
      closeOnClick: true, 
      closeOnMove: false,
    })
    .setLngLat(coordinates)
    .setHTML(content)
    .addTo(this.map)
  }

  mapLoaded(){

    this.geocoder = this.getAttribute('geocoder');
    if(this.geocoder !== null){   
      if(typeof(MapboxGeocoder) === 'undefined'){
        this.innerHTML = `If you would like to use the geocoder element, 
        you must include the geocoder plugin in your HTML: 
        https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/`
        return
      } 
      this.initializeGeoCoder();
    }

    this.geolocate_attribute = this.getAttribute('geolocate')
    if(this.geolocate_attribute !== null){
      this.initializeGeoLocate();
    }

    if(this.navigation_control){
      this.initializeNavigationControl();
    }

    this.map.on('moveend', (e) => {
      this.handleMoveEnd(e)
    });

    const geo_json_components = this.querySelectorAll('geo-json');
    [...geo_json_components].forEach((geo_json_component) => {
      this.getGeoJSON(geo_json_component);
    })

    this.style.opacity = 1;
    this.handleZoom(this.zoom);
    this.dispatchEvent(new Event('GEO MAP LOADED'));

  }

  // Layer Tools
  showLayer(layer_id){  
    const visibility = this.map.getLayoutProperty(layer_id, 'visibility');
    if (typeof visibility !== 'undefined') {
      if (visibility === 'none') {
        this.map.setLayoutProperty(layer_id, 'visibility', 'visible');
      }
    }
  }

  hideLayer(layer_id){
    var visibility = this.map.getLayoutProperty(layer_id, 'visibility');
    if (typeof visibility !== 'undefined') {
      if (visibility !== 'none') {
        this.map.setLayoutProperty(layer_id, 'visibility', 'none');
      }
    }
  }

  getLayer(layer_id){
    // Get the layer by ID
    const layer = this.map.getLayer(layer_id);
    // Check if the layer exists
    if (layer) {
      return layer;
    } else {
      return console.error('Layer not found.');
    }
  }
  getLayers(){
    // These Layers are Default.
    const layers = this.map.getStyle().layers;
    let unique_layers = []
    // Iterate over the layers and print their IDs
    layers.forEach(function(layer) {
      if(default_layers.indexOf(layer.id) < 0){
        unique_layers.push(layer.id);
      }
    });
    return unique_layers;
  }

  /*
  
    getGeoJSON
    fetches Geo JSON

   */

  getGeoJSON(geo_json_component){
    const geoJsonUrl = geo_json_component.getAttribute('src');
    const property = geo_json_component.getAttribute('variable');
    const template = geo_json_component.querySelector('template');

    if(this.style.color.length < 1){
      this.style.color = "#F00";
    }
    fetch(geoJsonUrl)
    .then(response => response.json())
    .then((data) => {
      // Add the GeoJSON layer to the map
      this.map.addSource('geojson-data', {
        type: 'geojson',
        data: data
      });
      // Add a layer to visualize the GeoJSON data
      const geoJSONAnalysis = describeGeoJSON(data);
      const layerStyles = generateLayerStyle(geoJSONAnalysis);
      layerStyles.forEach((style) => {
        this.map.addLayer(style);
        this.showLayer(style.id);
        // Add click event listener to the map
        this.map.on('click', style.id, (e) => {
          if (e.features.length > 0) {
            const feature = e.features[0];
            console.log(feature.properties);
            this.map.flyTo({center:feature.geometry.coordinates});
            let popup_content = JSON.stringify(feature.properties);
            if(template !== null){
              popup_content = populateTemplate(feature.properties, template);
            }
            // Use showPopup method to show the feature's properties
            this.showPopup(popup_content, feature.geometry.coordinates);
          }
        });

        // Change the cursor to a pointer when the it enters a feature in the 'geojson-layer'.
        this.map.on('mouseenter', style.id, () => {
          this.map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        this.map.on('mouseleave', style.id, () => {
          this.map.getCanvas().style.cursor = '';
        });
      });


      this.dispatchEvent(
        new CustomEvent('GEO JSON LOADED', 
          {
            detail: {
              data
            }
          }
        )
      )
    })
    .catch(error => {
      console.log('Error fetching GeoJSON:', error);
    });
  }

}

customElements.define('geo-map', GeoMapComponent);


const default_layers = [
  "background",
  "satellite",
  "tunnel-minor-case",
  "tunnel-street-case",
  "tunnel-minor-link-case",
  "tunnel-secondary-tertiary-case",
  "tunnel-primary-case",
  "tunnel-major-link-case",
  "tunnel-motorway-trunk-case",
  "tunnel-path",
  "tunnel-steps",
  "tunnel-pedestrian",
  "tunnel-minor",
  "tunnel-minor-link",
  "tunnel-major-link",
  "tunnel-street",
  "tunnel-street-low",
  "tunnel-secondary-tertiary",
  "tunnel-primary",
  "tunnel-motorway-trunk",
  "road-path",
  "road-steps",
  "road-pedestrian",
  "road-minor-case",
  "road-street-case",
  "road-minor-link-case",
  "road-secondary-tertiary-case",
  "road-primary-case",
  "road-major-link-case",
  "road-motorway-trunk-case",
  "road-minor",
  "road-minor-link",
  "road-major-link",
  "road-street",
  "road-street-low",
  "road-secondary-tertiary",
  "road-primary",
  "road-motorway-trunk",
  "bridge-path",
  "bridge-steps",
  "bridge-pedestrian",
  "bridge-minor-case",
  "bridge-street-case",
  "bridge-minor-link-case",
  "bridge-secondary-tertiary-case",
  "bridge-primary-case",
  "bridge-major-link-case",
  "bridge-motorway-trunk-case",
  "bridge-minor",
  "bridge-minor-link",
  "bridge-major-link",
  "bridge-street",
  "bridge-street-low",
  "bridge-secondary-tertiary",
  "bridge-primary",
  "bridge-motorway-trunk",
  "bridge-major-link-2-case",
  "bridge-motorway-trunk-2-case",
  "bridge-major-link-2",
  "bridge-motorway-trunk-2",
  "aerialway",
  "admin-1-boundary-bg",
  "admin-0-boundary-bg",
  "admin-1-boundary",
  "admin-0-boundary",
  "admin-0-boundary-disputed",
  "road-label",
  "road-intersection",
  "road-number-shield",
  "road-exit-shield",
  "path-pedestrian-label",
  "ferry-aerialway-label",
  "waterway-label",
  "natural-line-label",
  "natural-point-label",
  "water-line-label",
  "water-point-label",
  "poi-label",
  "transit-label",
  "airport-label",
  "settlement-subdivision-label",
  "settlement-minor-label",
  "settlement-major-label",
  "state-label",
  "country-label",
  "continent-label",
  'tunnel-oneway-arrow-blue',
  'tunnel-oneway-arrow-white',
  'road-oneway-arrow-blue',
  'road-oneway-arrow-white',
  'bridge-oneway-arrow-blue',
  'bridge-oneway-arrow-white',
  'buildingswithid',
  'nearby-roofs',
  'building',
  'council-wide',
  'council-wide-query',
  'council-wide-borders'
];

// Initialize the map with Germany in the center
const map = L.map('map').setView([51.1657, 10.4515], 6);

const geocoder = L.Control.geocoder({
    position: 'topright',
    placeholder: 'Search for places...',
    defaultMarkGeocode: false
}).addTo(map);

geocoder.on('markgeocode', function(e) {
    const bbox = e.geocode.bbox;
    const poly = L.polygon([
        bbox.getSouthEast(),
        bbox.getNorthEast(),
        bbox.getNorthWest(),
        bbox.getSouthWest()
    ]);
    map.fitBounds(poly.getBounds());
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

map.locate({ setView: true, maxZoom: 16 });

map.on('locationfound', function(e) {
    L.marker(e.latlng).addTo(map)
        .bindPopup("You are here").openPopup();
});

map.on('locationerror', function(e) {
    alert("Location access denied.");
});

let poiLayers = L.layerGroup().addTo(map);

async function fetchPOIs() {
    try {
        // Show the loading indicator
        document.getElementById('loadingIndicator').style.display = 'block';

        const bounds = map.getBounds();
        const bbox = `${bounds._southWest.lat},${bounds._southWest.lng},${bounds._northEast.lat},${bounds._northEast.lng}`;
        const query = `
            [out:json][timeout:25];
            area(3600051477)->.germany;
            (
                node(area.germany)["amenity"="school"]({{bbox}});
                node(area.germany)["amenity"="kindergarten"]({{bbox}});
                node(area.germany)["amenity"="childcare"]({{bbox}});
                node(area.germany)["amenity"="preschool"]({{bbox}});
                node(area.germany)["amenity"="youth_centre"]({{bbox}});
                // Additional amenities can be added here
            );
            out body;
        `.replace(/{{bbox}}/g, bbox);

        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data); // Add this line

        // Hide the loading indicator
        document.getElementById('loadingIndicator').style.display = 'none';

        return data.elements;
    } catch (error) {
        // Hide the loading indicator in case of error as well
        document.getElementById('loadingIndicator').style.display = 'none';
        throw error;
    }
}

// Function to update the map with new POIs
async function updatePOIs() {
    var pois = await fetchPOIs();
    poiLayers.clearLayers(); // Clear existing POI layers

    pois.forEach(poi => {
        let color;
        switch (poi.tags.amenity) {
            case 'school':
                color = 'blue';
                break;
            case 'kindergarten':
                color = 'green';
                break;
            case 'childcare':
                color = 'yellow';
                break;
            case 'preschool':
                color = 'orange';
                break;
            case 'youth_centre':
                color = 'purple';
                break;
            default:
                color = 'red'; // Default color if amenity type is not matched
        }

        L.circle([poi.lat, poi.lon], {
            color: color,
            fillColor: color,
            fillOpacity: 0.5,
            radius: 100
        }).addTo(poiLayers);
    });
}

map.on('moveend', updatePOIs)

// Initial POI load
updatePOIs()

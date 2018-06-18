// Create Google map variables
var map;
var largeInfowindow;
var bounds;

// Array of locations shown to the user
var locations = [
	{title: 'Bath Baseball Park', location: {lat: 41.20126339999999, lng: -81.65864169999999}},
	{title: 'Bath Nature Preserve', location: {lat: 41.180979, lng: -81.650083}},
	{title: 'Cuyahoga Valley National Park', location: {lat: 41.2808248, lng: -81.56781199999999}},
	{title: 'Furnance Run Park', location: {lat: 41.2689311, lng: -81.6393255}},
	{title: 'Richfield Heritage Preserve', location: {lat: 41.2491768, lng: -81.67502399999999}},
	{title: 'Richfield Woods Park', location: {lat: 41.2428157, lng: -81.65967259999999}},
	{title: 'Summit Metro Parks', location: {lat: 41.12817, lng: -81.542683}}
  ];

// Data Model
var Location = function(data) {
	var self = this;

	this.title = data.title;
	this.position = data.location;

	// Style the markers a bit. This will be our listing marker icon.
    var defaultIcon = makeMarkerIcon('00BA22');

    // Create a "highlighted location" marker color for when the user
    // mouses over the marker.
    var highlightedIcon = makeMarkerIcon('BAFF00');

	// Create a marker per location.
	this.marker = new google.maps.Marker({
		position: this.position,
		title: this.title,
		map: map,
		animation: google.maps.Animation.DROP,
		icon: defaultIcon
	});

	// Extend the bounds of the map to show the markers
	bounds.extend(this.marker.position);
	map.fitBounds(bounds);

	// Display or hide the marker
	this.showMarker = function(showMe) {
		if (showMe) {
			// Extend the boundaries of the map for each marker and display the marker
			this.marker.setMap(map);
			bounds.extend(this.marker.position);
			map.fitBounds(bounds);
		} else {
            this.marker.setMap(null);
		}
	};

	// Animate the associated marker when a list item is clicked
	this.setLocation = function(clickedLocation) {
		animateMarker(this.marker);
	};
	
	// Create an onclick event to open the large infowindow at each marker
	// and animate the marker.
	this.marker.addListener('click', function() {
		populateInfoWindow(this, largeInfowindow);
		animateMarker(this);
	});

	// Two event listeners - one for mouseover, one for mouseout,
	// to change the colors back and forth.
	this.marker.addListener('mouseover', function() {
		this.setIcon(highlightedIcon);
	});
	this.marker.addListener('mouseout', function() {
		this.setIcon(defaultIcon);
	});
}

// View Model
var ViewModel = function() {
	
	// keep a pointer to the "outer this"
	var self = this;
	
	this.locationList = ko.observableArray([]);
	this.searchLocation = ko.observable("");
	
	locations.forEach(function(locationItem){
		self.locationList.push( new Location(locationItem) );
	});
	
	this.filteredLocationList = ko.computed(function() {
		var filter = self.searchLocation().toLowerCase();

		// If nothing has been entered in the search box, return all locations
		// otherwise filter the location titles and return matching results
		if (!filter) {
			return self.locationList();
		} else {
			return ko.utils.arrayFilter(self.locationList(), function(item){
				return item.title.toLowerCase().indexOf(filter) !== -1;
			});
		}
	});	

	// Subscribe to changes to the filtered location list and show/hide the appropriate markers
	this.filteredLocationList.subscribe(function (newLocations) {
		ko.utils.arrayForEach(self.locationList(), function (item) {
			var showMe = false;
			for (i=0; i < newLocations.length; i++) {
				if (newLocations[i].title == item.title)
					showMe = true;
			}
			item.showMarker(showMe);
		});
	 });

}

function initMap() {
	// Create a styles array to use with the map.
	var styles = [
		{
			featureType: 'water',
			stylers: [
			{ color: '#19a0d8' }
			]
		},{
			featureType: 'administrative',
			elementType: 'labels.text.stroke',
			stylers: [
			{ color: '#ffffff' },
			{ weight: 6 }
			]
		},{
			featureType: 'administrative',
			elementType: 'labels.text.fill',
			stylers: [
			{ color: '#e85113' }
			]
		},{
			featureType: 'road.highway',
			elementType: 'geometry.stroke',
			stylers: [
			{ color: '#efe9e4' },
			{ lightness: -40 }
			]
		},{
			featureType: 'transit.station',
			stylers: [
			{ weight: 9 },
			{ hue: '#e85113' }
			]
		},{
			featureType: 'road.highway',
			elementType: 'labels.icon',
			stylers: [
			{ visibility: 'off' }
			]
		},{
			featureType: 'water',
			elementType: 'labels.text.stroke',
			stylers: [
			{ lightness: 100 }
			]
		},{
			featureType: 'water',
			elementType: 'labels.text.fill',
			stylers: [
			{ lightness: -100 }
			]
		},{
			featureType: 'poi',
			elementType: 'geometry',
			stylers: [
			{ visibility: 'on' },
			{ color: '#f0e4d3' }
			]
		},{
			featureType: 'road.highway',
			elementType: 'geometry.fill',
			stylers: [
			{ color: '#efe9e4' },
			{ lightness: -25 }
			]
		}
		];

	// Constructor creates a new map - only center and zoom are required.
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 41.249712, lng: -81.6642619},
		zoom: 5,
		styles: styles,
		mapTypeControl: false
		});

	// Intialize the Info Window
	largeInfowindow = new google.maps.InfoWindow();
	bounds = new google.maps.LatLngBounds();
	// Activate Knockout
	ko.applyBindings(new ViewModel());
}

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, infowindow) {
	// Check to make sure the infowindow is not already opened on this marker.
	if (infowindow.marker != marker) {
		// Clear the infowindow content to give the streetview time to load.
		infowindow.setContent('');
		infowindow.marker = marker;
		// Make sure the marker property is cleared if the infowindow is closed.
		infowindow.addListener('closeclick', function() {
		infowindow.marker = null;
		});
		
		var streetViewService = new google.maps.StreetViewService();
		var radius = 500;
		// In case the status is OK, which means the pano was found, compute the
		// position of the streetview image, then calculate the heading, then get a
		// panorama from that and set the options
		function getStreetView(data, status) {
			if (status == google.maps.StreetViewStatus.OK) {
				var nearStreetViewLocation = data.location.latLng;
				var heading = google.maps.geometry.spherical.computeHeading(
				nearStreetViewLocation, marker.position);
				iwContent = iwContent + '<div id="pano"></div>';
				infowindow.setContent(iwContent);
				var panoramaOptions = {
					position: nearStreetViewLocation,
					pov: {
					heading: heading,
					pitch: 10
					},
					addressControl: false
				};
				var panorama = new google.maps.StreetViewPanorama(
				document.getElementById('pano'), panoramaOptions);
			} else {
				iwContent = iwContent + '<div>No Street View Found</div>';
				infowindow.setContent(iwContent);
			}
		}
		
		foursquare_client_id = "TEVDKIQNOMLTDB1RKLQCZTRH1E2RN1XPTRKSCZY5OXYTLZMB"
		foursquare_client_secret = "NJ0TME0QXGLC0XSIJ2LMX3BQYRJYLGPVWS1FFHNHDXKWQUPR"
		// variable for info window content
		var iwContent = '<div>' + marker.title + '</div>';
	
    	// Get JSON request of foursquare data
    	var url = 'https://api.foursquare.com/v2/venues/search?ll=' + marker.position.lat() + ',' + marker.position.lng() + '&client_id=' + foursquare_client_id + '&client_secret=' + foursquare_client_secret + '&v=20180601' + "&query='" + marker.title + "'";
		$.getJSON(url).done(function(data) {
			if (data.response.venues) {
				// Get the first result
				var results = data.response.venues[0];
				var venue_id = results.id;
				var address = results.location.formattedAddress;
				for (i =0; i < address.length; i++) {
					iwContent = iwContent + '<br />' + address[i];
				}
				// Use streetview service to get the closest streetview image within
				// 500 meters of the markers position
				streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
			} else {
				iwContent = iwContent + '<div>No Street View Found</div>';
			}
		}).fail(function() {
			iwContent = iwContent + '<div>Foursquare content unavailable</div>';
		}).always(function() {
			infowindow.setContent(iwContent);
		});

		// Open the infowindow on the correct marker.
		infowindow.open(map, marker);
	}
}

// This function will bounce animate the passed marker
function animateMarker(marker) {
	marker.setAnimation(google.maps.Animation.BOUNCE);
	setTimeout(function() {
		marker.setAnimation(null)
	}, 700);
}	

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
	var markerImage = new google.maps.MarkerImage(
		'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
		'|40|_|%E2%80%A2',
		new google.maps.Size(21, 34),
		new google.maps.Point(0, 0),
		new google.maps.Point(10, 34),
		new google.maps.Size(21,34));
	return markerImage;
}

// Show error
function errorMap() {
	alert('Uh-oh... unable to load Google Maps');
}


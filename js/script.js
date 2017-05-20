(function() {
  'use strict';
  var facilities;
  var myMap;
  var markers = [];
  var collections = [];

  var selectedFacility;
  var selectedMarker;
  var selectedCollection;

  var setLeafletMap = function() {
    myMap = L.map('mapid').setView([40.4165000, -3.7025600], 13)

    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(myMap);
  };

  var getFacilityByAddress = function(address) {
    var facility;
    facilities.forEach(function(element) {
      if (element.address && element.address['street-address'] === address) {
        facility = element;
        return;
      }
    });
    return facility;
  };

  var hasMarker = function(facility) {
    var found = false;
    markers.forEach(function(element) {
      if (element._latlng.lat === facility.location.latitude && element._latlng.lng === facility.location.longitude) {
        found = true;
        return;
      }
    });
    return found;
  };

  var addImageToCarousel = function(image, num) {
    var active = '';
    if (num === 0) {
      active = 'active';
    }
    $('.carousel-indicators').append('<li class=" ' + active + '" data-target="#myCarousel" data-slide-to="' + num + '"></li>');
    $('.carousel-inner').append('<div class="item  ' + active + '"><img src="' + image + '"></div>');
  };

  var setWikiImages = function(latitude, longitude) {
    var url = 'https://commons.wikimedia.org/w/api.php?format=json&action=query&generator=geosearch&ggsprimary=all&ggsnamespace=6&' +
      'ggsradius=500&ggscoord=' + latitude + '|' + longitude +
      '&ggslimit=10&prop=imageinfo&iilimit=1&iiprop=url&iiurlwidth=200&iiurlheight=200&callback=?';


    $.getJSON(url, function(json) {
        var dic = json.query.pages;
        var num = 0;
        for (var key in dic) {
          if (dic.hasOwnProperty(key)) {
            addImageToCarousel(dic[key].imageinfo[0].thumburl, num);
            num++;
          }
        }
      })
      .fail(function(error) {
        console.log('error downloading wikimedia images', error);
      });
  };

  var cleanCarousel = function() {
    $('.carousel-indicators').empty();
    $('.carousel-inner').empty();
  };

  var setCarousel = function(latitude, longitude) {
    cleanCarousel();
    setWikiImages(latitude, longitude);
  };

  var showFacility = function(facility) {
    $('#facility-info').empty();
    $('#facility-info').html('<h2>' + facility.title + '</h2>' +
      '<p>' + facility.address['street-address'] + ', ' + facility.address['postal-code'] + ', ' + facility.address['locality'] + '</p>' +
      '<p>' + facility.organization['organization-desc']);

    setCarousel(facility.location.latitude, facility.location.longitude);
    myMap.flyTo(new L.LatLng(facility.location.latitude, facility.location.longitude), 19);
  };

  var setMarker = function(facility) {
    if (!facility.location) {
      return;
    }

    var marker = L.marker([facility.location.latitude, facility.location.longitude]).addTo(myMap);
    marker.bindPopup('<p>' + facility.title + '</p>');
    marker.on('click', function() {
      selectedMarker = marker;
      selectedFacility = facility;
      showFacility(facility);
    });
    markers.push(marker);
  };

  var cleanInfo = function() {
    $('#facility-info').empty();
    cleanCarousel();
  };

  var removeMarker = function() {
    if (!selectedMarker) {
      $('#facility-info').prepend('<p style="color: red;">Click first the marker on the map to remove</p>');
      return false;
    }

    var pos = markers.indexOf(selectedMarker);
    markers.splice(pos, 1);
    selectedMarker.remove();
    return true;
  };

  var removeAllMarkers = function() {
    markers.forEach(function(element) {
      element.remove();
    });
    markers = [];
    selectedMarker = null;
  };

  var setAllMarkers = function() {
    removeAllMarkers();
    facilities.forEach(function(element) {
      setMarker(element);
    });
  };

  var isInSelectedCollection = function(id) {
    var found = false;
    selectedCollection.facilities.forEach(function(element) {
      if (element === id) {
        found = true;
        return;
      }
    });
    return found;
  }

  var clickFacilityCallback = function() {
    var address = $(this).text();
    var facility = getFacilityByAddress(address);
    selectedFacility = facility;
    if (!hasMarker(facility)) {
      setMarker(facility);
    }
    showFacility(facility);
  };

  var addToSelectedCollection = function(facility) {
    if (!selectedCollection) {
      return;
    }

    if (isInSelectedCollection(facility.id)) {
      return;
    }

    selectedCollection.facilities.push(facility.id);
    $('#collections-list').append('<li class="collections-item list-group-item ui-widget-content">' + facility.address['street-address'] + '</li>');
    $('li.collections-item').click(clickFacilityCallback);
  };

  var getCollectionByName = function(name) {
    var collection;
    collections.forEach(function(element) {
      if (element.name === name) {
        collection = element;
        return;
      }
    });
    return collection;
  };

  var getFacilityById = function(id) {
    var facility;
    facilities.forEach(function(element) {
      if (element.id === id) {
        facility = element;
        return;
      }
    });
    return facility;
  }

  var loadPanelCollections = function() {
    $('#collections-list').empty();

    selectedCollection.facilities.forEach(function(id) {
      var facility = getFacilityById(id);
      $('#collections-list').append('<li class="collections-item list-group-item ui-widget-content">' + facility.address['street-address'] + '</li>');
    });

    $('li.collections-item').click(clickFacilityCallback);
  };

  var loadMainTab = function() {
    if (!myMap) {
      setLeafletMap();
    }

    if (facilities) {
      setAllMarkers();
    }

    $('#remove-marker').click(function() {
      if (removeMarker()) {
        cleanInfo();
      }
    });

    $('#remove-all-markers').click(function() {
      cleanInfo();
      removeAllMarkers();
    });

    $('#show-all-markers').click(function() {
      cleanInfo();
      setAllMarkers();
    });
  };

  var loadCollectionsTab = function() {
    $('#create-button').click(function() {
      var name = $('#input-collection').val();
      if (name) {
        $('#input-collection').val('');
      }

      var collection = {
        name: name,
        facilities: []
      };
      collections.push(collection);

      $('#all-collections-list').append('<li class="all-collections-item list-group-item ui-widget-content"><h3>' + collection.name + '</h3></li>');
      $('li.all-collections-item').click(function() {
        selectedCollection = getCollectionByName($(this.innerHTML).text());
        $('#collections-panel-name').text(selectedCollection.name);
        loadPanelCollections();
      });
    });
  };

  var loadFacilitiesTab = function() {
    // console.log(collections);
  };

  $(document).ready(function() {
    var maintab = 'maintab';
    var collectionstab = 'collectionstab';
    var facilitiestab = 'facilitiestab';
    var tabs = [maintab, collectionstab, facilitiestab];

    // get html tabs
    tabs.forEach(function(tab) {
      $.ajax({
          url: tab + '.html'
        })
        .done(function(data) {
          $('#' + tab + '-content').html(data).css('display', 'none');
        })
        .fail(function() {
          $('#' + tab + '-content').html('<div class="row box"><h1 style="text-align: center;">Could not load tab!</h1></div>');
          console.log('error');
        });
    });

    $('#load-facilities').click(function() {
      $.getJSON('json/facilities.json', function(json) {
          facilities = json['@graph'];
        })
        .done(function() {
          var list = $('#facilities-list');
          facilities.forEach(function(element) {
            if (element.location && element.address) {
              list.append('<li class="facilities-item list-group-item ui-widget-content">' + element.address['street-address'] + '</li>');
            }
          });
          $('#init-content').css('display', 'none');
          $('#content-placeholder').css('display', 'block');

          $('li.facilities-item').draggable({
            cancel: 'a.ui-icon',
            revert: true,
            containment: 'document',
            helper: 'clone',
            cursor: 'move',
            cursorAt: {
              left: 5
            }
          });

          $('li.facilities-item').click(clickFacilityCallback);

          $('#collections-panel').droppable({
            accept: 'li.facilities-item',
            classes: {
              'ui-droppable-active': 'ui-state-active',
              'ui-droppable-hover': 'ui-state-hover'
            },
            drop: function(event, ui) {
              var facility = getFacilityByAddress(ui.draggable.text());
              addToSelectedCollection(facility);
            }
          });

          $('#maintab').click();
        })
        .fail(function(error) {
          $('#load-facilities').empty();
          $('#load-facilities').append('<p>Error: could not get facilities! RETRY</p>');
          console.log(error);
        });
    });

    // embed html fragment for tabs
    $('.tab').click(function(event) {
      if (!facilities) {
        return;
      }

      var id = $(event.currentTarget).attr('id');
      $('#' + id + '-content').css('display', 'block');

      tabs.forEach(function(tab) {
        if (tab !== id) {
          $('#' + tab + '-content').css('display', 'none');
        }
      });

      switch (id) {
        case maintab:
          loadMainTab();
          break;
        case collectionstab:
          loadCollectionsTab();
          break;
        case facilitiestab:
          loadFacilitiesTab();
          break;
      }

    });
  });
})();

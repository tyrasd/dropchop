var dropchop = (function(dc) {

  'use strict';

  dc = dc || {};
  dc.layerlist = {};
  dc.layerlist.elems = {};

  dc.layerlist.init = function(name) {
    dc.layerlist.$elem = $('<ol>').addClass(name);
    dc.$elem.append(dc.layerlist.$elem);

    // Clicking on layerlist but not layer (ie below layers) clears selection
    dc.layerlist.$elem.on('click', function(event) {
      if ($(event.target).hasClass(name)) {
        dc.selection.clear();
      }
    });

    var liHelper = $('<li>').addClass('layer-help')
      .html('Welcome to <strong>dropchop</strong>! Here you can drag and drop files and they will show up in the layer list below.<br><br>To the left you can upload and save your files or <a href="/?gist=09129c20ec020b83bf85">add example data</a> or the <a href="/?gist=d066b572e8a8ad2b6d16">US States</a>.<br><br>To the right you\'ll notice some geospatial operations that become available based on selecting specific layers.' );
    dc.layerlist.$elem.append(liHelper);

    var toggleLayers = $('<li>').addClass('layer-toggleAll')
      .html('<label><input type="checkbox" checked>Toggle all layers</label>');
    toggleLayers.on('change', dc.layerlist.toggleAll);
    dc.layerlist.$elem.append(toggleLayers);

    $(dc).on('layer:added', dc.layerlist.addLayerListItem);
    $(dc).on('layer:removed', dc.layerlist.removeLayerListItem);
    $(dc).on('layer:renamed', dc.layerlist.rename);
  };

  dc.layerlist.rename = function(event, stamp, newName) {
    $('[data-stamp='+stamp+']').find('.layer-name').text(newName);
  };

  // triggered in dropchop.js
  dc.layerlist.addLayerListItem = function(event, layer) {
    var layerlistItem = $('<li>').addClass('layer-element').attr('data-stamp', layer.stamp);
    var layerDiv = $('<div>')
      .addClass('layer-name layer-new')
      .text(layer.name)
      .delay(3000)
      .queue(function(next) {
        $(this).removeClass('layer-new');
      });

    var layerType = $('<span>').addClass('layer-type-image sprite sprite-layer-'+layerTypeIcon(layer.type));
    var checkbox = $('<input>').addClass('layer-toggle').prop({'type': 'checkbox', 'checked': true});
    var dropdown = $('<button title="More Options">').addClass('layer-action layer-dropdown').html('<i class="fa fa-ellipsis-h"></i>');

    checkbox.on('change', function(event) {
      if (this.checked) {
        // trigger layer:show
        $(dc).trigger('layer:show', [layer]);
      } else {
        $(dc).trigger('layer:hide', [layer]);
      }
    });

    layerDiv.on('click', function(event) {
      // check for keys being held for special selection
      if (event.shiftKey) {
        // select all layeres in between previous target and target
        // note: don't unselect layers already selected, just add to selection
        var toSelect = [];
        var to = $(this);
        var from = dc.layerlist._lastSelected;
        var toCount, fromCount;

        if (!from) return;

        $('.layer-element').each(function(e) {
          var check = $(this).attr('data-stamp');
          var toStamp = to.parent().attr('data-stamp');
          var fromStamp = from.parent().attr('data-stamp');
          if (check === toStamp) toCount = e;
          if (check === fromStamp) fromCount = e;
        });

        if (toCount > fromCount) {
          // loop up
          $('.layer-element').each(function(l) {
            if (l >= fromCount && l <= toCount ) {
              dc.layerlist.selectLayer($(this).find('.layer-name'), dc.layers.list[$(this).attr('data-stamp')]);
            }
          });
        } else {
          $('.layer-element').each(function(l) {
            if (l < fromCount && l >= toCount ) {
              dc.layerlist.selectLayer($(this).find('.layer-name'), dc.layers.list[$(this).attr('data-stamp')]);
            }
          });
        }
      } else if (event.metaKey || event.ctrlKey) {
        // add/remove selected layer to current selection
        dc.layerlist.selectToggle($(this), layer);
      } else {
        // clear selection and select target
        dc.layerlist.clearSelection($(this), layer);
        dc.layerlist.selectToggle($(this), layer);
      }
    });

    layerDiv.on('contextmenu', function(event) {
      dc.menus.layerContextMenu.createLayerContextMenu(
        this, event.offsetX, event.pageY
      );
      event.preventDefault();
    });

    dropdown.on('click', function(event) {
      dc.menus.layerContextMenu.createLayerContextMenu(
        // I have no idea why we need to subtract 40px but that's what
        // it takes to make it position correctly...
        $(this).siblings('.layer-name'), event.pageX - 40, event.pageY
      );
      event.preventDefault();
      return false; // disable further click handlers
    });

    layerDiv.on('dblclick', function(event) {
      dc.ops.file.extent.execute();
    });

    layerlistItem.append(layerDiv);
    layerlistItem.append(checkbox);
    layerlistItem.append(layerType);
    layerlistItem.append(dropdown);
    dc.layerlist.$elem.append(layerlistItem);

    dc.layerlist.elems[layer.stamp] = layerlistItem;

    // hide helper text
    $('.layer-help').hide();
    $('.layer-toggleAll').show();

    // send out layerlist:added signal
    $(dc).trigger('layerlist:added', layerDiv);
  };

  dc.layerlist.selectLayer = function($item, lyr) {
    if (!$item.hasClass('selected')) {
      $item.addClass('selected');
      $(dc).trigger('layer:selected', [lyr]);
    }
  };
  dc.layerlist.selectToggle = function($item, lyr) {
    if ($item.hasClass('selected')) {
      $item.removeClass('selected');
      $(dc).trigger('layer:unselected', [lyr]);
    } else {
      $item.addClass('selected');
      $(dc).trigger('layer:selected', [lyr]);
    }
    dc.layerlist._lastSelected = $item;
  };
  dc.layerlist.clearSelection = function($item, lyr) {
    dc.selection.clear();
  };
  dc.layerlist.selectAll = function() {
    $('.layer-element').each(function(l) {
      dc.layerlist.selectLayer($(this).find('.layer-name'), dc.layers.list[$(this).attr('data-stamp')]);
    });
  };
  dc.layerlist.checkAll = function(mustBeSelected) {
    for (var i in dc.layers.list) {
      var layer = dc.layers.list[i];
      if (mustBeSelected && !dropchop.selection.isSelected(layer)) {
        continue;
      }
      elemToggle(dc.layers.list[i].stamp, true);
    }
  };
  dc.layerlist.uncheckAll = function(mustBeSelected) {
    for (var i in dc.layers.list) {
      var layer = dc.layers.list[i];
      if (mustBeSelected && !dropchop.selection.isSelected(layer)) {
        continue;
      }
      elemToggle(layer.stamp, false);
    }
  };
  dc.layerlist.toggleAll = function(event) {
    if ($(this).find('input').prop('checked')) {
      dc.layerlist.uncheckAll();
    } else {
      dc.layerlist.checkAll();
    }
  };
  dc.layerlist.removeLayerListItem = function(event, stamp) {
    $('[data-stamp='+stamp+']').fadeOut(300, function() {
      $(this).remove();
      delete dc.layerlist.elems[stamp];

      // show helper text if no layers exist
      // this has to check inside since there is a 300 ms delay with the fade
      if ($('.layer-element').length === 0) {
        $('.layer-help').show();
        $('.layer-toggleAll').hide();
      }
    });
  };

  function layerTypeIcon(type) {
    var icon;
    switch(type) {
      case 'FeatureCollection':
        icon = 'featurecollection';
        break;
      case 'Feature<Point>':
      case 'Feature<MultiPoint>':
        icon = 'point';
        break;
      case 'Feature<LineString>':
      case 'Feature<MultiLineString>':
        icon = 'line';
        break;
      case 'Feature<Polygon>':
      case 'Feature<MultiPolygon>':
        icon = 'polygon';
        break;
      case 'Feature<GeometryCollection>':
        icon = 'geom';
        break;
      default:
        icon = 'default';
        break;
    }
    return icon;
  }

  function elemToggle(stamp, bool) {
    $('.layer-element[data-stamp='+stamp+']')
      .find('.layer-toggle')
      .prop('checked', bool)
      .trigger('change'); // sets off a chain reaction
  }

  return dc;

})(dropchop || {});

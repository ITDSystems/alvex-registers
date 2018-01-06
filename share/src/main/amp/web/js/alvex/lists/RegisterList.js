define(["dojo/_base/declare",
    "alfresco/lists/AlfFilteredList",
    "alfresco/core/topics",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class"
  ],
  function(declare, AlfFilteredList, topics, array, lang, domClass) {

    return declare([AlfFilteredList], {
      onFilterRequest: function alvex_lists_RegisterList__onFilterRequest(payload) {
        if (payload) {
          for (var i in payload) {
            if (i.substr(0, 7) === "filter_") {
              // Look to see if there is an existing filter that needs to be updated
              var existingFilter = array.some(this.dataFilters, function(filter) {
                var match = filter.name === i;
                if (match) {
                  filter.value = payload[i];
                }
                return match;
              });
              // If there wasn't an existing filter then add the payload as a new one...
              if (!existingFilter) {
                this.dataFilters.push({
                  name: i,
                  value: payload[i]
                });
              }
            }

          }
          // Setup a new timeout (clearing the old one, just in case)
          clearTimeout(this._filterTimeoutHandle);
          this._filterTimeoutHandle = setTimeout(lang.hitch(this, function() {
            if (this.requestInProgress) {
              this.pendingLoadRequest = true;
            } else {
              this.onFiltersUpdated();
            }
          }), this._filterDelay);
        }
      }
    });
  });

define(["dojo/_base/declare",
        "alfresco/core/Core",
        "alfresco/core/topics",
        "alfresco/documentlibrary/_AlfDocumentListTopicMixin",
        "dojo/_base/lang",
        "dojo/_base/array"],
        function( declare, Core, topics, _AlfDocumentListTopicMixin, lang, array) {

   return declare([Core, _AlfDocumentListTopicMixin], {

      currentlySelectedItems: null,

      debounceTime: 50,

      disableWhenNothingSelected: false,

      itemKeyProperty: "nodeRef",

      previouslySelectedItems: null,

      selectedItems: null,

      selectionTimeout: null,

      createSelectedItemSubscriptions: function alvex_registers_SelectedItemStateMixin__createSelectedItemSubscriptions() {
         this.currentlySelectedItems = {};
         this.alfSubscribe("ALVEX_REGISTER_ALF_DOCLIST_DOCUMENT_SELECTED", lang.hitch(this, this.onItemSelected));
         this.alfSubscribe("ALVEX_REGISTER_ALF_DOCLIST_DOCUMENT_DESELECTED", lang.hitch(this, this.onItemDeselected));
         this.alfSubscribe(topics.CLEAR_SELECTED_ITEMS, lang.hitch(this, this.onItemSelectionCleared));
      },

      deferredSelectionHandler: function alvex_registers_SelectedItemStateMixin__deferredSelectionHandler() {
         this.selectedItems = [];
         for (var key in this.currentlySelectedItems)
         {
            if (this.currentlySelectedItems.hasOwnProperty(key)) {
               this.selectedItems.push(this.currentlySelectedItems[key]);
            }
         }
         if (this.disableWhenNothingSelected)
         {
            this.setDisabled(this.selectedItems.length === 0);
         }

         this.publishSelectedItems(this.selectedItems);
         this.selectionTimeout = null;
      },

      setDisabled: function alvex_registers_SelectedItemStateMixin__setDisabled(disable) {
         this.set("disabled", disable);
      },

      onItemDeselected: function alvex_registers_SelectedItemStateMixin__onItemDeselected(payload) {
         if (payload && payload.value)
         {
            var itemKey = lang.getObject(this.itemKeyProperty, false, payload.value);
            if (typeof itemKey !== "undefined")
            {
               delete this.currentlySelectedItems[itemKey];
               if (this.selectionTimeout)
               {
                  clearTimeout(this.selectionTimeout);
               }
               this.selectionTimeout = setTimeout(lang.hitch(this, this.deferredSelectionHandler), this.debounceTime);
            }
            else
            {
               this.alfLog("warn", "Could not find item key property: '" + this.itemKeyProperty + "' in deselected item value", payload, this);
            }
         }
      },

      onItemSelected: function alvex_registers_SelectedItemStateMixin__onItemSelected(payload) {
         if (payload && payload.value)
         {
            var itemKey = lang.getObject(this.itemKeyProperty, false, payload.value);
            if (typeof itemKey !== "undefined")
            {
               this.currentlySelectedItems[itemKey] = payload.value;
               if (this.selectionTimeout)
               {
                  clearTimeout(this.selectionTimeout);
               }
               this.selectionTimeout = setTimeout(lang.hitch(this, this.deferredSelectionHandler), 50);
            }
            else
            {
               this.alfLog("warn", "Could not find item key property: '" + this.itemKeyProperty + "' in selected item value", payload, this);
            }
         }
      },

      onItemSelectionCleared: function alvex_registers_SelectedItemStateMixin__onItemSelectionCleared(/*jshint unused:false*/ payload) {
         this.previouslySelectedItems = this.currentlySelectedItems;
         this.currentlySelectedItems = {};
         if (this.selectionTimeout)
         {
            clearTimeout(this.selectionTimeout);
         }
         this.selectionTimeout = setTimeout(lang.hitch(this, this.deferredSelectionHandler), 50);
      },

      onSelectedItemsChange: function alvex_registers_SelectedItemStateMixin__onSelectedItemsChange(payload) {
         if (payload.selectedItems)
         {
            this.selectedItems = payload.selectedItems;
         }
         else
         {
            this.alfLog("warn", "A publication was made indicating an item selection update, but no 'selectedItems' attribute was provided in the payload", payload, this);
         }
      },

      publishSelectedItems: function alvex_registers_SelectedItemStateMixin__publishSelectedItems() {
         this.alfPublish(this.selectedDocumentsChangeTopic, {
            selectedItems: this.selectedItems || []
         });
         this.alfPublish(this.documentSelectionTopic, {
            selectedItems: this.selectedItems || []
         });
      },

      retainPreviousItemSelectionState: function alvex_registers_SelectedItemStateMixin__retainPreviousItemSelectionState(items) {
         var itemsToRepublish = [];
         if (this.previouslySelectedItems)
         {
            array.forEach(items, function(item) {

               var itemKey = lang.getObject(this.itemKeyProperty, false, item);
               if (itemKey && this.previouslySelectedItems[itemKey])
               {
                  itemsToRepublish.push(item);
                  this.currentlySelectedItems[itemKey] = item;
               }
            }, this);
         }
         if (itemsToRepublish.length)
         {
            this.alfPublish(this.selectedDocumentsChangeTopic, {
               selectedItems: itemsToRepublish
            });
            this.alfPublish(this.documentSelectionTopic, {
               selectedItems: itemsToRepublish
            });
         }
      }
   });
});

define(["dojo/_base/declare",
        "alfresco/menus/AlfMenuBarPopup",
        "alvex/registers/SelectedItemStateMixin",
        "alfresco/core/ObjectProcessingMixin",
        "alfresco/documentlibrary/_AlfDocumentListTopicMixin",
        "alfresco/core/topics",
        "dojo/_base/lang"],
        function(declare, AlfMenuBarPopup, SelectedItemStateMixin, ObjectProcessingMixin, _AlfDocumentListTopicMixin, topics, lang) {

   return declare([AlfMenuBarPopup, SelectedItemStateMixin, ObjectProcessingMixin, _AlfDocumentListTopicMixin], {

      passive: true,

      disabled: true,

      disableWhenNothingSelected: true,

      processActionPayloads: false,

      postCreate: function alvex_registers_SelectedItemsMenuBarPopup__postCreate() {
         if (this.passive === true)
         {
            this.alfSubscribe(this.selectedDocumentsChangeTopic, lang.hitch(this, this.onFilesSelected));
         }
         else
         {
            this.createSelectedItemSubscriptions();
         }

         this.alfSubscribe(topics.SELECTED_DOCUMENTS_ACTION, lang.hitch(this, this.onSelectedDocumentsAction));
         this.inherited(arguments);
      },

      onFilesSelected: function alvex_registers_SelectedItemsMenuBarPopup__onFilesSelected(payload) {
         this.set("disabled", (payload && payload.selectedItems && payload.selectedItems.length === 0));
         this.selectedItems = payload.selectedItems;
      },

      onSelectedDocumentsAction: function alvex_registers_SelectedItemsMenuBarPopup__onSelectedDocumentsAction(payload) {
         payload.documents = this.selectedItems;
         if (this.processActionPayloads)
         {
            // There are circumstances where the requested action might need access to the selected nodes *within*
            // the payload. This can be achieved by referencing the {nodes} token with the payload and using the standard
            // object processing mixin.
            this.currentItem = {
               nodes: this.selectedItems
            };
            var clonedPayload = lang.clone(payload);
            this.processObject(["processCurrentItemTokens"], clonedPayload);
            this.alfServicePublish(topics.MULTIPLE_ITEM_ACTION_REQUEST, clonedPayload);
         }
         else
         {
            this.alfServicePublish(topics.MULTIPLE_ITEM_ACTION_REQUEST, payload);
         }
      }
   });
});

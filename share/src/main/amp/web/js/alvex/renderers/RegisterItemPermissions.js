/*
  Renders icon for datagrid to show user can he/she view the node or node
*/

define(["dojo/_base/declare",
        "aikau/core/BaseWidget",
        "alfresco/renderers/_PublishPayloadMixin",
        "service/constants/Default",
        "dojo/_base/array",
        "dojo/_base/lang",
        "dojo/dom-construct",
        "dojo/on"],
        function(declare, BaseWidget, _PublishPayloadMixin, AlfConstants, array, lang, domConstruct, on) {

   return declare([BaseWidget, _PublishPayloadMixin], {

      i18nRequirements: [{
         i18nFile: "./i18n/RegisterItemPermissions.properties"
      }],

      cssRequirements: [{
         cssFile: "./css/RegisterItemPermissions.css"
      }],

      allowedIcons: [
        "view",
        "edit",
        "delete"
      ],

      propertyToRender: null,

      _currentPermissions: null,

      /**
       * Overrides [the inherited function]{@link module:aikau/core/BaseWidget#createWidgetDom}
       * to construct the DOM for the widget using native browser capabilities.
       *
       * @instance
       * @since 1.0.101
       */
      createWidgetDom: function alvex_renderers_RegisterItemPermissions__createWidgetDom() {
         this.containerNode = this.domNode = document.createElement("div");
         this.domNode.classList.add("alvex-renderers-RegisterItemPermissions");
      },

      /**
       * Set up the attributes to be used when rendering the template.
       *
       * @instance
       */
      postMixInProperties: function alvex_renderers_RegisterItemPermissions__postMixInProperties() {
         var property = this.currentItem && this.propertyToRender && this.currentItem.properties[this.propertyToRender];
         this.renderedValue = (property && this.getRenderedProperty(property)) || "";
         this._currentPermissions = this.currentItem.permissions;
      },

      /**
       *
       * @instance
       */
      postCreate: function alvex_renderers_RegisterItemPermissions__postCreate() {
         for (var permission in this._currentPermissions.userAccess) {
           this.addPermission(permission, this._currentPermissions.userAccess[permission]);
         };
      },

      addPermission: function alvex_renderers_RegisterItemPermissions__addPermission(permission, value) {

         var src, classes, label;
         if (this.allowedIcons.indexOf(permission) != "-1") {
           src = require.toUrl("alvex/renderers/css/images/permissions/" + permission + "-" + value + "-16.png");
           label = this.message("status." + permission + "." + value);
         }
         classes = ["permission"];

         var img = domConstruct.create("img", {
            "src": src,
            "title": label,
            "alt": "",
            "class": classes.join(" ")
         }, this.containerNode);
      }

   });
});

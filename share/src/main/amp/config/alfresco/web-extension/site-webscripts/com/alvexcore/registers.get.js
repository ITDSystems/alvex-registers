<import resource="classpath:alfresco/site-webscripts/org/alfresco/share/imports/share-header.lib.js">
<import resource="classpath:alfresco/site-webscripts/org/alfresco/share/imports/share-footer.lib.js">
<import resource="classpath:alfresco/web-extension/site-webscripts/com/alvexcore/lib/registers.lib.js">

var siteId = (page.url.templateArgs.site != null) ? page.url.templateArgs.site : "";

var headerServices = getHeaderServices();
var headerWidgets = getHeaderModel(getPageTitle());

var registersServices = getRegistersServices();
var registersWidgets = getRegistersWidgets({
   siteId: siteId
});
var services = headerServices.concat(registersServices);

headerWidgets.push(registersWidgets);

model.jsonModel = getFooterModel(services, headerWidgets);
model.jsonModel.groupMemberships = user.properties["alfUserGroups"];

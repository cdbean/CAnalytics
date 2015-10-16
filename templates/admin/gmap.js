{% extends "admin/openlayers.js" %}
// var gphy = new OpenLayers.Layer.Google(
//     "Google Physical",
//     {type: google.maps.MapTypeId.TERRAIN}
// );
// var gmap = new OpenLayers.Layer.Google(
//     "Google Streets", // the default
//     {numZoomLevels: 20}
// );
// var ghyb = new OpenLayers.Layer.Google(
//     "Google Hybrid",
//     {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20}
// );
// var gsat = new OpenLayers.Layer.Google(
//     "Google Satellite",
//     {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
// );
{% block base_layer %}new OpenLayers.Layer.Google(
     "Google Satellite", // the default
     {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
 );
{% endblock %}
{% block extra_layers %}
{{ module }}.map.addLayers([
    new OpenLayers.Layer.Google(
        "Google Hybrid",
        {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 22}
    ),
    new OpenLayers.Layer.Google(
        "Google Physical",
        {type: google.maps.MapTypeId.TERRAIN}
    ),
    new OpenLayers.Layer.Google(
        "Google Streets", // the default
        {numZoomLevels: 22}
    )
]);
{% endblock %}



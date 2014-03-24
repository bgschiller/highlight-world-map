
function expandTextarea(){
  //should be .call'd on the element you want to expand.
  while($(this).outerHeight() < this.scrollHeight + parseFloat($(this).css("borderTopWidth")) + parseFloat($(this).css("borderBottomWidth"))) {
      $(this).height($(this).height()+1);
  }
}
function isHexColor(color){
  //Returns the hex color string, or false if not valid color
  if (color[0] !== '#'){
    color = '#' + color;
  } //prefix # if necessary
  if (typeof color === 'string' &&
      color.length == 7 &&
      ! isNaN( parseInt(color.slice(1,7), 16) ) ){
        return color;
      }
  return false; //no color found.
}

function isEmptyObj(obj){
  return (Object.getOwnPropertyNames(obj).length === 0);
}
/* Search params code from http://stackoverflow.com/a/5448635/1586229 */
function getSearchParameters() {
    var prmstr = window.location.search.substr(1);
    return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

function transformToAssocArray( prmstr ) {
    var params = {};
    var prmarr = prmstr.split("&");
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = decodeURIComponent(tmparr[1]);
    }
    return params;
}
function substringMatcher(strs) {
  return function findMatches(q, cb) {
    var matches, substringRegex;

    // an array that will be populated with substring matches
    matches = [];

    startswithRegex = new RegExp('^'+ q, 'i');
    $.each(strs, function(i, str) {
      if (startswithRegex.test(str)) {
        // the typeahead jQuery plugin expects suggestions to a
        // JavaScript object, refer to typeahead docs for more info
        matches.push({ value: str });
      }
    });

    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp(q, 'i');

    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    $.each(strs, function(i, str) {
      if (substrRegex.test(str) && !startswithRegex.test(str)) {
        // the typeahead jQuery plugin expects suggestions to a
        // JavaScript object, refer to typeahead docs for more info
        matches.push({ value: str });
      }
    });
    cb(matches);
  };
};

function getActiveCountries(){
  var country_list = $("#active_countries").val();
  if (country_list === ""){
    return [];
  }
  return country_list.split('\n');
}

var default_active_color = "#009dd9";
var default_inactive_color = "#b3b3b3";

var params = getSearchParameters();

if (isEmptyObj(params)){ //No map selected, display form
  document.getElementById('form_container').style.display = 'block';
  var country_to_id = {};
  var id_to_country = {};
  var country_list = [];
  var selected_countries = [];
  d3.tsv("world-country-names.tsv")
      .get(function(error, rows){
        //create a map from name to id.
        for(var ix=0; ix < rows.length; ix++){
          country_to_id[rows[ix].name] = rows[ix].id;
          id_to_country[rows[ix].id] = rows[ix].name;
          country_list.push(rows[ix].name);
        }


        //add typeahead data source
        $('#add_country.typeahead').typeahead({
          hint:true,
          highlight:true,
          minLength:1
        },
        {
          name: 'countries',
          displayKey: 'value',
          source: substringMatcher(country_list)
        })
        .on('typeahead:selected',function($e, country){
          current_countries = getActiveCountries();
          current_countries.push(country.value);
          $("#active_countries").val(current_countries.join('\n'));
          $("#add_country").val('');
          expandTextarea.call(document.getElementById('active_countries'));
        });

        //prior to submit, replace each country in #active_countries
        //with its id, given by name_map[country_name]
        $("#map_form").submit(function( $e ){
          $("#active_countries").val($.map(getActiveCountries(),
            function(country,ix){
              return country_to_id[country];
            }).join(','));
        })

        //if the user pressed 'back', replace the comma-separated list
        //of ids with a newline-separated list of countries.
        var ac = $('#active_countries');
        if (ac.val() !== ""){
          ac.val($.map(ac.val().split(','),
          function(val,ix){
            return id_to_country[val]
          }).join('\n'));
        }
        expandTextarea.call(document.getElementById('active_countries'));
    });

} else { //display map

  //Dynamic stylesheet code from http://davidwalsh.name/add-rules-stylesheets
  var sheet = (function() {
  /* Create the <style> tag */
  var style = document.createElement("style");

  // WebKit hack :(
  style.appendChild(document.createTextNode(""));

  /* Add the <style> element to the page */
  document.head.appendChild(style);

  return style.sheet;
  })();

  active_country_style = "fill: " +
      (isHexColor(params.active_color) || default_active_color) +
      ";";
  sheet.addRule(".active_country",active_country_style);

  inactive_country_style = "fill: " +
      (isHexColor(params.inactive_color) || default_inactive_color) +
      ";";
  sheet.addRule(".inactive_country",inactive_country_style);

  var active_countries = params.active_countries.split(',');

  var width = 960,
      height = 500;

  var projection = d3.geo.robinson()
      .scale(150)
      .translate([width / 2, height / 2])
      .precision(.1);

  var path = d3.geo.path()
      .projection(projection);

  var graticule = d3.geo.graticule();

  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height);

  svg.append("defs").append("path")
      .datum({type: "Sphere"})
      .attr("id", "sphere")
      .attr("d", path);

  svg.append("use")
      .attr("class", "stroke")
      .attr("xlink:href", "#sphere");

  svg.append("use")
      .attr("class", "fill")
      .attr("xlink:href", "#sphere");

  //"/mbostock/raw/4090846/"
  d3.json("world-50m.json", function(error, world) {

    svg.selectAll(".country")
        .data(topojson.feature(world,world.objects.countries).features)
        .enter().append("path")
        .attr("class",function(d) {
          for (var ix=0; ix<active_countries.length; ix++){
            if (d.id == active_countries[ix]){
              return "active_country";
            }
          }
          return "inactive_country";
        }).attr("d",path);

    svg.insert("path", ".graticule")
        .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
        .attr("class", "boundary")
        .attr("d", path);
  });

  d3.select(self.frameElement).style("height", height + "px");
}

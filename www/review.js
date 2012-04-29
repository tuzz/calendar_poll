$(document).ready(function() {
  initialiseReview();
});

var complexData;

//Parses the data string from the server and sets up the graphs and table.
function initialiseReview() {
  path = document.location.href.split("/")[4];
  $.ajax({
    url: "../db/eventReview/" + path,
    success: function(dataString) {
      if (dataString == "null") document.location.href = "/";
      buildData(dataString);
      if (complexData.length <= 18) displayGraph();
      //else displayTable();
      else displayList();
    },
    async: false
  });
}

//Displays a bar chart for day availability.
function displayGraph() {
  var min = 0, max = 0;
  var minSet = false, maxSet = false;
  for (var i = 0; i < complexData.length; i++) {
    if (complexData[i][1] < min || !minSet) {
      min = complexData[i][1];
      minSet = true;
    }
    if (complexData[i][1] > max || !maxSet) {
      max = complexData[i][1];
      maxSet = true;
    }
  }

  var range = max - min;
  var color = new Array(max + 1);
  if (max == 0) color[0] = "00";
  else
    for (var i = 0; i < parseInt(parseInt(max, 10) + 1, 10); i++) {
      color[i] = 255 - Math.floor(255 / max * i);
      color[i] = color[i].toString(16);
      if (color[i].length == 1) color[i] = "0" + color[i];
    }

  var array = new Array(complexData.length);
  max = 0, maxIndex = 0;
  for (var i = 0, total, current; i < complexData.length; i++) {
    total = parseInt(complexData[i][1], 10) + parseInt(complexData[i][2], 10) + parseInt(complexData[i][3], 10);
    current = Math.round(parseInt(complexData[i][1], 10) / total * 100);
    if (current >= max) {
      if (current == max) {
        if (parseInt(complexData[i][2], 10) < parseInt(complexData[maxIndex][2], 10)) {
          max = current;
          maxIndex = i;
        }
      }
      else {
        max = current;
        maxIndex = i;
      }
    }
    if (total == 0) current = 0;
    array[i] = new Array(3);
    array[i][0] = current;
    array[i][1] = complexData[i][0];
    array[i][2] = "#" + color[complexData[i][1]] + "ff00";
  }

  $('#graph').jqBarGraph({ data: array, width: 600, height: 450, barSpace: 5, speed: 5, postfix: "%"});

  var yearSpan = false;
  if (complexData[0][0].split("-")[0] != complexData[complexData.length - 1][0].split("-")[0])
    yearSpan = true;

  var length = "tiny", weekday = false;
  if (complexData.length <= 15) length = "short";
  if (complexData.length <= 11) length = "medium";
  if (complexData.length <= 6 && !yearSpan) weekday = true;
  if (complexData.length <= 6 && yearSpan) length = "long";
  if (complexData.length <= 4) { length = "long"; weekday = true; }

  $(".graphLabelgraph").each(function() { $(this).text(dynamicDate($(this).text(), weekday, length)); })
  $(".graphFieldgraph").css("cursor", "pointer");
  $(".graphFieldgraph").mousedown(function() { displaySummary($(this).attr("id")); });
  displaySummary("graphField" + maxIndex + "graph");
}

//Displays the summary for a bar in the summary div.
var selected;
function displaySummary(id) {
  var index = parseInt(id.split("graph")[1].split("Field")[1], 10);

  if (selected != undefined) {
    $("#graphLabel" + selected + "graph").css("font-weight", "normal");
    $("#graphFieldBar" + selected + "graph").css("border-left", "none");
    $("#graphFieldBar" + selected + "graph").css("border-right", "none");
  }
  selected = index;
  $("#graphLabel" + index + "graph").css("font-weight", "bold");
  if (complexData[index][1] != 0) {
    $("#graphFieldBar" + index + "graph").css("border-left", "2px dashed black");
    $("#graphFieldBar" + index + "graph").css("border-right", "2px dashed black");
  }


  var html = "<span id=\"summary-day\">"+dynamicDate(complexData[index][0], true, "long")+"</span>";
  html += "<div id=\"summary-stats\">";
  html += "<span class=\"available\">"+complexData[index][1]+" available</span> / ";
  html += "<span class=\"busy\">"+complexData[index][2]+" busy</span> / ";
  html += complexData[index][3]+" unspecified</div>";
  html += "<div id=\"summary-names\">";
  var names = "";
  for (var i = 0; i < complexData[index][4].length; i++) {
    if (i != 0) names += ", ";
    names += "<span class=\"available\">"+stripTags(complexData[index][4][i])+"</span>";
  }
  if (names == "<span class=\"available\"></span>") names = "";
  if (names != "" && complexData[index][5] != "") names += ", ";
  for (var i = 0; i < complexData[index][5].length; i++) {
    if (i != 0) names += ", ";
    names += "<span class=\"busy\">"+stripTags(complexData[index][5][i])+"</span>";
  }
  if (names == "<span class=\"busy\"></span>") names = "";
  if (names != "" && complexData[index][6] != "") names += ", ";
  for (var i = 0; i < complexData[index][6].length; i++) {
    if (i != 0) names += ", ";
    names += stripTags(complexData[index][6][i]);
  }
  if (names != "") names += ".";
  html += names;
  html += "</div>";
  $("#summary").html(html);
}

//Strips out html tags.
function stripTags(html) {
  return html.replace("<", "&lt;").replace(">", "&gt;");
}

function displayList() {
  var min = 0, max = 0;
  var minSet = false, maxSet = false;
  for (var i = 0; i < complexData.length; i++) {
    if (complexData[i][1] < min || !minSet) {
      min = complexData[i][1];
      minSet = true;
    }
    if (complexData[i][1] > max || !maxSet) {
      max = complexData[i][1];
      maxSet = true;
    }
  }

  var range = max - min;
  var color = new Array(max + 1);
  var inverse = new Array(max + 1);
  if (max == 0) color[0] = "00";
  else
    for (var i = 0; i < parseInt(parseInt(max, 10) + 1, 10); i++) {
      color[i] = 255 - Math.floor(255 / max * i);
      inverse[i] = 255 - color[i];
      color[i] = color[i].toString(16);
      inverse[i] = inverse[i].toString(16);
      if (color[i].length == 1) color[i] = "0" + color[i];
      if (inverse[i].length == 1) inverse[i] = "0" + inverse[i];
    }


  max = 0, maxIndex = 0;
  for (var i = 0, total, current; i < complexData.length; i++) {
    total = parseInt(complexData[i][1], 10) + parseInt(complexData[i][2], 10) + parseInt(complexData[i][3], 10);
    current = Math.round(parseInt(complexData[i][1], 10) / total * 100);
    if (current >= max) {
      if (current == max) {
        if (parseInt(complexData[i][2], 10) < parseInt(complexData[maxIndex][2], 10)) {
          max = current;
          maxIndex = i;
        }
      }
      else {
        max = current;
        maxIndex = i;
      }
    }
  }

  var html = "";
  for (var i = 0; i < complexData.length; i++) {
    if (i == 0) html += "<div class=\"list-item\" style=\"border-top: 1px dashed gray; background-color: #ffff"+color[complexData[i][1]]+"\">";
    else html += "<div class=\"list-item\" style=\"background-color: #ffff"+color[complexData[i][1]]+"\">";
    html += "<span class=\"list-day\">"+dynamicDate(complexData[i][0], true, "long")+"</span>";
    html += "<span class=\"list-stats\">";
    html += "<span class=\"available\">"+complexData[i][1]+" available</span> / ";
    html += "<span class=\"busy\">"+complexData[i][2]+" busy</span> / ";
    html += complexData[i][3]+" unspecified</span></div>";
  }
  $("#graph").html(html);
  $("#summary").hide();
  $("#prior").text("Too many days have been selected to view the results as a graph. The following table shows the availability of guests on each day. The level of highlight relates to the number of available guests. It may be a good idea to create a new calendar from the top few results of this poll.");
}

//Parses the dataString for the current path into a complex array.
//Cardinality: [#dates][#list]([#names])?
//Elements of 'list': {date, #available, #busy, #unspecified, [available], [busy], [unspecified]}
function buildData(dataString) {
  var dates = dataString.split(":");
  complexData = new Array(dates.length);
  for (var i = 0, list; i < dates.length; i++) {
    list = dates[i].split(";");
    complexData[i] = new Array(list.length);
    for (var j = 0; j < 4; j++)
      complexData[i][j] = list[j];
    var available = list[4].split(",");
    complexData[i][4] = new Array(available.length);
    for (var j = 0; j < available.length; j++)
      complexData[i][4][j] = unescape(available[j]).replace("%2F", "/");
    var busy = list[5].split(",");
    complexData[i][5] = new Array(busy.length);
    for (var j = 0; j < busy.length; j++)
      complexData[i][5][j] = unescape(busy[j]).replace("%2F", "/");
    var unspecified = list[6].split(",");
    complexData[i][6] = new Array(unspecified.length);
    for (var j = 0; j < unspecified.length; j++)
      complexData[i][6][j] = unescape(unspecified[j]).replace("%2F", "/");
  }
}

//Gets a date string, of length 'short', 'medium', or 'long'.
//Set day to true if you want the day of the week.
function dynamicDate(date, weekday, length) {
  var array = date.split("-");
  var year = array[0];
  var month = array[1];
  var day = array[2];

  var str;
  switch (length) {
    case 'tiny': str = parseInt(day, 10);
    break;
    case 'short': str = day + "/" + month;
    break;
    case 'medium': str = parseInt(day, 10) + " " + monthName(month);
    break;
    case 'long': str = dynamicDate(date, false, 'medium') + ", " + year;
    break;
    default: str = date;
  }

  if (weekday) {
    var date = new Date(array[0], array[1] - 1, array[2]);
    str = dayName(date.getDay() + 1) + ", " + str;
  }

  return str;
}

//Gets the name of a day.
function dayName(day) {
  switch (day) {
    case 1: return "Mon";
    case 2: return "Tue";
    case 3: return "Wed";
    case 4: return "Thu";
    case 5: return "Fri";
    case 6: return "Sat";
    case 7: return "Sun";
    default: return "null";
  }
}

//Gets the name of a month.
function monthName(month) {
  month = parseInt(month, 10);
  switch (month) {
    case 1: return "Jan";
    case 2: return "Feb";
    case 3: return "Mar";
    case 4: return "Apr";
    case 5: return "May";
    case 6: return "Jun";
    case 7: return "Jul";
    case 8: return "Aug";
    case 9: return "Sep";
    case 10: return "Oct";
    case 11: return "Nov";
    case 12: return "Dec";
    default: return "";
  }
}
/*
Copyright 2011, Christopher Patuzzo.
All rights reserved.
*/
var activeMonth = 0;
var today = new Date();
var priorOverlap;
var animating = false;
var delay = 600;
var slideEffect = true, fadeEffect = true;
var selected = [], available = [], busy = [];
var cycleSelection = false;
var enabledC = "#000", disabledC = "#999";
var path, access;
var linkMinimised = true;

$(document).ready(function() {
  initialiseCalendar();
});

//Use API to grab date string if path exists, otherwise set up a new one.
//Toggle div content and initialise calendar accordingly.
function initialiseCalendar() {
  if (navigator.appName == 'Microsoft Internet Explorer') {
    var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
    if (re.exec(navigator.userAgent) != null)
      if (parseFloat(RegExp.$1) < 8) {
        $("*").hide();
        alert("Sorry, this website is not compatibile with your version of Internet Explorer.");
        document.location.href = "http://www.google.com/chrome";
      }
  }

  $(window).resize(function() { if (!animating) setViewport(activeMonth); });
  $("#calendar-today").mousedown(function() { if (activeMonth != 0) setMonth(0); });
  $("#calendar-clear").mousedown(function() { clearSelections(); });

  var dateString = "";
  path = document.location.href.split("/")[3];
  if (path != "") {
    $.ajax({
      url: "/db/getDates/" + path,
      success: function(data) {
        dateString = data;
      },
      async: false
    });
  }
  if (dateString != "") cycleSelection = true;

  if (cycleSelection) {
    preload(["icons/button.png", "icons/gray.png",
         "icons/green.png", "icons/red.png",
         "icons/yellow.png"]);
    $("#prior").hide();
    $("#prior-alternate").show();
    $("#post").hide();
    $("#post-alternate").show();
    $("#name div").mousedown(finish);
    $("#review a").attr("href", "http://calendar-poll.com/review/" + path);

    var dates = dateString.split(", ");
    selected = [];
    for (var i = 0, array, y, m, d; i < dates.length; i++) {
      array = dates[i].split("-");
      y = parseInt(array[0], 10) - today.getFullYear();
      m = parseInt(array[1], 10) - today.getMonth() - 1;
      d = parseInt(array[2], 10);
      selected.splice(selected.length, 0, (y * 12 + m) + "x" + d);
    }
    activeMonth = parseInt(selected[0].split("x")[0], 10);

    $("#calendar-clear").text("Reset");
    $("#calendar-menu td:last").prepend("<div id=\"calendar-last\">Last</div>");
    $("#calendar-menu td:last").prepend("<div id=\"calendar-first\">First</div>");

    $("#calendar-first").mousedown(function() { setFirst(); });
    $("#calendar-last").mousedown(function() { setLast(); });

    updateButtons(activeMonth);
  }
  else {
    preload(["icons/button.png", "icons/gray.png",
         "icons/yellow.png"]);

    $.ajax({
      url: "/db/requestEvent",
      success: function(data) {
        var array = data.split(", ");
        path = array[0];
        access = array[1];
        $("#link input").val("http://calendar-poll.com/" + path);
      },
      async: false
    });
  }

  setActive();
}

//Sets the calendar to the active month.
function setActive() {
  $("#calendar-month").text(monthString(activeMonth));
  $("#calendar-days").html(generateTriple(activeMonth));
  setViewport(activeMonth);

  $("#calendar-days td").unbind("mousedown");
  $(".calendar-arrow:first").unbind("mousedown");
  $(".calendar-arrow:last").unbind("mousedown");

  $("#calendar-days td").mousedown(function() { selectDay($(this).attr("id")); });
  $(".calendar-arrow:first").mousedown(function() { selectDay((activeMonth - 1) + "x0"); });
  $(".calendar-arrow:last").mousedown(function() { selectDay((activeMonth + 1) + "x0"); });

  makeUnselectable(document.getElementById("calendar"));
  for (var i = 0; i < selected.length; i++)
    $("#" + selected[i]).addClass("calendar-selected");
  for (var i = 0; i < available.length; i++)
    $("#" + available[i]).addClass("calendar-available");
  for (var i = 0; i < busy.length; i++)
    $("#" + busy[i]).addClass("calendar-busy");

  if (cycleSelection) {
    $(".calendar-active").css("cursor", "default");
    for (var i = 0; i < selected.length; i++)
      $("#" + selected[i]).css("cursor", "pointer");
    for (var i = 0; i < available.length; i++)
      $("#" + available[i]).css("cursor", "pointer");
    for (var i = 0; i < busy.length; i++)
      $("#" + busy[i]).css("cursor", "pointer");
  }
}

//Preloads images on page load (http://goo.gl/xxqoC)
function preload(arrayOfImages) {
    $(arrayOfImages).each(function(){
        $('<img/>')[0].src = this;
    });
}

//Sets viewport for a given month, relative to the current month.
function setViewport(monthOffset) {
  $("#calendar-days").height(monthHeight(monthOffset));
  $("#calendar-days table").css("margin-top", monthMargin(monthOffset));
}

//Transitions between months if required. Toggles or cycles selections based on mode.
function selectDay(id) {
  var array = id.split("x");
  var month = parseInt(array[0], 10);
  var day = parseInt(array[1], 10);

  var direction = month - activeMonth;
  if (direction != 0) transition(direction);
  if (day == 0) return;

  if (cycleSelection) {
    if ($("#" + id).hasClass("calendar-selected")) {
      selected.splice($.inArray(id, selected), 1);
      $("#" + id).removeClass("calendar-selected");

      available.splice(available.length, 0, id);
      $("#" + id).addClass("calendar-available");
      available.sort(dateSort);
    }
    else if ($("#" + id).hasClass("calendar-available")) {
      available.splice($.inArray(id, available), 1);
      $("#" + id).removeClass("calendar-available");

      busy.splice(busy.length, 0, id);
      $("#" + id).addClass("calendar-busy");
      busy.sort(dateSort);
    }
    else if ($("#" + id).hasClass("calendar-busy")) {
      busy.splice($.inArray(id, busy), 1);
      $("#" + id).removeClass("calendar-busy");

      selected.splice(selected.length, 0, id);
      $("#" + id).addClass("calendar-selected");
      selected.sort(dateSort);
    }

    if (available.length == 0 && busy.length == 0)
      $("#calendar-clear").css({"color": disabledC, "cursor": "default"});
    else $("#calendar-clear").css({"color": enabledC, "cursor": "pointer"});

    if (available.length > 0 || busy.length > 0) {
      $("#name div").css("color", enabledC);
      $("#name div").css("cursor", "pointer");
    }
    else {
      $("#name div").css("color", disabledC);
      $("#name div").css("cursor", "default");
    }
  }
  else {
    if ($.inArray(id, selected) != -1)
      selected.splice($.inArray(id, selected), 1);
    else selected.splice(selected.length, 0, id);

    selected.sort(dateSort);

    $("#" + id).toggleClass("calendar-selected");

    if (selected.length == 0) $("#calendar-clear").css({"color": disabledC, "cursor": "default"});
    else $("#calendar-clear").css({"color": enabledC, "cursor": "pointer"});

    if (selected.length >= 2) {
      $.ajax({
        url: "/db/updateEvent/" + path + "/" + access,
        type: "POST",
        data: ({ data: selectionString(selected) }),
        success: function() {
          $("#link input").animate({width: 430}, delay, function() {
            if (fadeEffect) $("#link img").fadeIn(delay);
            else $("#link img").show();
          });
        }
      });
    }
  }
}

function finish() {
  if (available.length == 0 && busy.length == 0) return;
  var name = escape($("#name input").val()).replace(/\//, "%2F");
  $.ajax({
    url: "/db/addResponse/" + path,
    data: ({ data: selectionString(available) + "x" + selectionString(busy) + "x" + name }),
    success: function(data) {
      self.location.href = "http://calendar-poll.com/review/" + path;
    },
    async: false
  });
}

//Updates the buttons style properties for a given month offset, relative to the current month.
function updateButtons(monthOffset) {
  if (monthOffset == 0) $("#calendar-today").css({"color": disabledC, "cursor": "default"});
  else $("#calendar-today").css({"color": enabledC, "cursor": "pointer"});

  if (cycleSelection) {
    if (available.length == 0 && busy.length == 0)
      $("#calendar-clear").css({"color": disabledC, "cursor": "default"});
    else $("#calendar-clear").css({"color": enabledC, "cursor": "pointer"});

    var array = selected.concat(available.concat(busy));
    if (monthOffset == parseInt(array[0].split("x")[0], 10))
      $("#calendar-first").css({"color": disabledC, "cursor": "default"});
    else $("#calendar-first").css({"color": enabledC, "cursor": "pointer"});

    if (monthOffset == parseInt(array[array.length - 1].split("x")[0], 10))
      $("#calendar-last").css({"color": disabledC, "cursor": "default"});
    else $("#calendar-last").css({"color": enabledC, "cursor": "pointer"});

    return;
  }

  if (selected.length == 0) $("#calendar-clear").css({"color": disabledC, "cursor": "default"});
  else $("#calendar-clear").css({"color": enabledC, "cursor": "pointer"});
}

//Comparison sort for iso formatted dates.
function dateSort(a, b) {
  var aArray = a.split("x");
  var bArray = b.split("x");

  if (aArray[0] == bArray[0]) return aArray[1] - bArray[1];
  else return aArray[0] - bArray[0];
}

//Clears all selections, or resets all selections, dependent upon selection mode.
function clearSelections() {
  if (cycleSelection) {
    $(".calendar-available").addClass("calendar-selected");
    $(".calendar-available").removeClass("calendar-available");
    selected = selected.concat(available);
    available = [];

    $(".calendar-busy").addClass("calendar-selected");
    $(".calendar-busy").removeClass("calendar-busy");
    selected = selected.concat(busy);
    busy = [];

    selected.sort(dateSort);

    $("#name div").css("color", disabledC);
    $("#name div").css("cursor", "default");
  }
  else {
    selected = [];
    $("#calendar-days td").removeClass("calendar-selected");

    $.ajax({
      url: "/db/removeEvent/" + path + "/" + access
    });
  }

  updateButtons(activeMonth);
}

//Gets a comma-delimited string of the selected dates, in iso format.
function selectionString(selectionArray) {
  if (selectionArray.length == 0) return "";
  var str = "";
  for (var i = 0, month, date, array, d; i < selectionArray.length; i++) {
    if (i != 0) str += ", ";
    array = selectionArray[i].split("x");
    d = new Date(today.getFullYear(), today.getMonth() + parseInt(array[0], 10), parseInt(array[1], 10));
    month = (d.getMonth() + 1).toString();
    if (month.length == 1) month = "0" + month;
    date = d.getDate().toString();
    if (date.length == 1) date = "0" + date;
    str += d.getFullYear() + "-" + month + "-" + date;
  }
  return str;
}

//Makes a transition between months in a given direction.
function transition(direction) {
  if (animating) return;

  updateButtons(activeMonth + direction);

  if (!slideEffect) {
    activeMonth += direction;
    setActive();
    return;
  }

  animating = true;
  $("#calendar-days").css("border-top-color", "black");
  $("#calendar-days").css("border-bottom-color", "black");
  $("#calendar-month").text(monthString(activeMonth + direction));
  $("#calendar-days").animate({height: monthHeight(activeMonth + direction)}, delay);
  $("#calendar-days table").animate({"margin-top": monthMargin(activeMonth + direction)}, delay, function() {
    activeMonth += direction;
    setActive();

    $("#calendar-days").css("border-top-color", "#ccc");
    $("#calendar-days").css("border-bottom-color", "#ccc");

    animating = false;
  });
}

//Sets the calendar to the first month containing a selection.
function setFirst() {
  var array = selected.concat(available.concat(busy));
  var monthOffset = parseInt(array[0].split("x")[0]);
  if (activeMonth == monthOffset) return;
  setMonth(monthOffset);
}

//Sets the calendar to the last month containing a selection.
function setLast() {
  var array = selected.concat(available.concat(busy));
  var monthOffset = parseInt(array[array.length - 1].split("x")[0]);
  if (activeMonth == monthOffset) return;
  setMonth(monthOffset);
}

//Sets the calendar to a given month relative to the current month. Reuse transition if possible.
function setMonth(monthOffset) {
  if (animating) return;

  updateButtons(monthOffset);

  if (Math.abs(monthOffset - activeMonth) == 1) {
    transition(monthOffset - activeMonth);
    return;
  }

  if (!fadeEffect) {
    activeMonth = monthOffset;
    setActive();
    return;
  }

  animating = true;
  $("#calendar-month").fadeOut(delay / 2);
  $("#calendar-days").fadeOut(delay / 2, function() {
    activeMonth = monthOffset;
    $("#calendar-days").show();
    setActive();
    $("#calendar-days").hide();

    $("#calendar-days").css("border-color", "#ccc");

    $("#calendar-month").fadeIn(delay / 2);
    $("#calendar-days").fadeIn(delay / 2, function() { animating = false; });
  });
}

//Calculates the height of a month in pixels, relative to the current month.
function monthHeight(monthOffset) {
  var pixels = $("#" + activeMonth + "x8").position().top - $("#" + activeMonth + "x1").position().top;

  d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  var days = (d.getDay() + 6) % 7 + getDays(monthOffset);
  var rows = Math.ceil(days / 7);

  return rows * pixels + 1;
}

//Calculates the top margin offset of a month, relative to the current month.
function monthMargin(monthOffset) {
  var pixels = $("#" + activeMonth + "x8").position().top - $("#" + activeMonth + "x1").position().top;

  switch (monthOffset - activeMonth) {
    case 0:
      var days = priorOverlap + getDays(activeMonth - 1);
      var rows = Math.floor(days / 7);
      return -rows * pixels;
    case 1:
      var days = priorOverlap + getDays(activeMonth - 1) + getDays(activeMonth);
      var rows = Math.floor(days / 7);
      return -rows * pixels;
    default: return 0;
  }
}

//Make a element, and all children, unselectable. (http://goo.gl/4lhM7)
function makeUnselectable(node) {
    if (node.nodeType == 1) {
        node.unselectable = true;
    }
    var child = node.firstChild;
    while (child) {
        makeUnselectable(child);
        child = child.nextSibling;
    }
}

//Generates table data for a three-month span, relative to the current month.
function generateTriple(monthOffset) {
  var daysM2 = getDays(monthOffset - 2);
  var daysM1 = getDays(monthOffset - 1);
  var days = getDays(monthOffset);
  var days1 = getDays(monthOffset + 1);

  var d = new Date(today.getFullYear(), today.getMonth() + monthOffset - 1, 1);
  priorOverlap = (d.getDay() + 6) % 7;
  d = new Date(today.getFullYear(), today.getMonth() + monthOffset + 2, 0);
  var postOverlap = 6 - (d.getDay() + 6) % 7;

  var html = "<table>";
  for (var i = daysM2 - priorOverlap + 1; i <= daysM2; i++)
    html += generateDay(i, monthOffset - 2);
  for (var i = 1; i <= daysM1; i++)
    html += generateDay(i, monthOffset - 1);
  for (var i = 1; i <= days; i++)
    html += generateDay(i, monthOffset);
  for (var i = 1; i <= days1; i++)
    html += generateDay(i, monthOffset + 1);
  for (var i = 1; i <= postOverlap; i++)
    html += generateDay(i, monthOffset + 2);

  return html+"</table>";
}

//Gets the number of days in a month relative to the current month.
function getDays(monthOffset) {
  var d = new Date(today.getFullYear(), today.getMonth() + 1 + monthOffset, 0);
  return d.getDate();
}

//Generates table data for a day, applying classes where appropriate.
var dayCount = 0;
function generateDay(day, month) {
  var html = "";
  if (dayCount == 0) html = "<tr>";

  var classes = "";
  if (month == activeMonth) classes = "calendar-active";
  if (month == 0 && day == today.getDate())
    classes += (classes == "" ? "" : " ") + "calendar-current";
  if (classes != "") classes = " class=\""+classes+"\"";
  html += "<td"+classes+" id=\""+month+"x"+day+"\">"+day+"</td>";
  dayCount++;

  if (dayCount == 7) {
    html += "</tr>";
    dayCount = 0;
  }

  return html;
}

//Gets the name of a month relative to the current month.
function monthString(monthOffset) {
  var d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  switch (d.getMonth()) {
    case 0: return "January " + d.getFullYear();
    case 1: return "February " + d.getFullYear();
    case 2: return "March " + d.getFullYear();
    case 3: return "April " + d.getFullYear();
    case 4: return "May " + d.getFullYear();
    case 5: return "June " + d.getFullYear();
    case 6: return "July " + d.getFullYear();
    case 7: return "August " + d.getFullYear();
    case 8: return "September " + d.getFullYear();
    case 9: return "October " + d.getFullYear();
    case 10: return "November " + d.getFullYear();
    case 11: return "December " + d.getFullYear();
  }
}
(function ($) {
  let responseData;
  let roomsAPI = "/rooms/getRoomsDropdown/";
  let departmentCreateAPI = "/departments";
  let departmentEditAPI = "/departments/edit";
  let formAction = $("#department-form").attr("data-function");
  let departmentID = $("#department-form").attr("data-departmentID");
  if ($("#department-building-location").val().trim() !== "#")
    ajaxCall($("#department-building-location").val().trim());
  $("#department-building-location").on("change", function () {
    ajaxCall($("#department-building-location").val().trim());
  });

  $("#back-btn").on("click", function (event) {
    event.preventDefault();
    location.href = "/departments/";
  });
  $("#department-form").on("submit", function (event) {
    event.preventDefault();
    let errors = [];
    $("#msg").empty();
    $("#error-form").empty();
    $("#error-form").attr("hidden", true);
    let departmentName = $("#department-name").val().trim();
    let departmentDesc = $("#department-desc").val().trim();
    let departmentType = $("#department-type").val().trim();
    let openTime = $("#department-hour-start");
    let openTimeVal = openTime.val().trim();
    let closeTime = $("#department-hour-end");
    let closeTimeVal = closeTime.val().trim();
    let locationVal = $("#department-building-location").val();
    let room = $("#department-room").val();
    let workinDays = $("#department-days").val();

    if (!departmentName || departmentName.length === 0)
      errors.push("Missing Department Name");

    if (!departmentType || departmentType === "#")
      errors.push("Please select Department Type");

    if (locationVal === "#") {
      errors.push("Please select location from dropdown");
      if (room === "#") errors.push("Missing room from dropdown");
    }

    if (openTimeVal === 0) errors.push("Missing Input time");
    if (closeTimeVal === 0) errors.push("Missing Input time");
    if (openTime.attr("type") === "time" && openTimeVal.length !== 8)
      openTimeVal = openTimeVal + ":00";
    if (closeTime.attr("type") === "time" && closeTimeVal.length !== 8)
      closeTimeVal = closeTimeVal + ":00";

    if (!checkTime(openTimeVal) || !checkTime(closeTimeVal))
      errors.push("Please Check input time format");

    if (!checkOperatingTimes(openTimeVal, closeTimeVal))
      errors.push("Close time cannot be less than open time");

    if (workinDays.length === 0) errors.push("Please select working days");

    if (errors.length === 0) {
      $("#msg").empty();
      $("#error-form").empty();
      let responseJSON = {
        departmentName,
        departmentDesc,
        departmentType,
        departmentOpen: openTimeVal,
        departmentClose: closeTimeVal,
        departmentLocationID: locationVal,
        departmentRoomID: room,
        departmentWorkinDays: workinDays,
      };
      $.ajax({
        url:
          formAction === "edit"
            ? departmentEditAPI + "/" + departmentID
            : departmentCreateAPI,
        type: formAction === "edit" ? "PUT" : "POST",
        data: JSON.stringify(responseJSON),
        contentType: "application/json; charset=utf-8",

        success: function (response) {
          if (response.departmentEdited && response.departmentEdited) {
            $("#msg").html("Department Edited!");
            $(".modal-title").text("Status");
            $("#myModal").modal("show");
            return;
          } else if (response.departmentCreated && response.departmentCreated) {
            $("#msg").html("New Department Created!");
            $(".modal-title").text("Status");
            $("#myModal").modal("show");
            return;
          } else {
            location.reload();
          }
        },
        error: function (xhr, textStatus, error) {
          console.log(xhr.responseJSON);
          console.log(textStatus);
          console.log(error);
          $("#msg").html(xhr.responseJSON.error);
          $(".modal-title").text("Error");
          $("#myModal").modal("show");

          $("#error-form").removeAttr("hidden");
          $("#error-form").append(
            `<p class="error">${xhr.responseJSON.error}</p>`
          );
        },
      });
    } else {
      $("#error-form").removeAttr("hidden");
      for (let i = 0; i < errors.length; i++) {
        $("#error-form").append(`<p class="error">${errors[i]}</p>`);
        $("#msg").append(`<p>${errors[i]}</p>`);
      }
      $("#myModal").modal("show");
      $(".modal-title").text("Errors");
    }
  });

  function ajaxCall(locationID) {
    if (!locationID) return;
    // let departmentID = $("#department-building-location").val();
    if (locationID !== "#")
      $.ajax({
        url: roomsAPI + locationID,
        success: function (response) {
          responseData = response;
          appendRooms(response.roomsData);
        },
        error: function () {
          window.alert("Please Reload page");
          location.reload();
        },
      });
    else {
      window.alert("Please Select Location");
      $("#department-room-div").attr("hidden", true);
    }
  }

  function appendRooms(response) {
    if (response.length === 0)
      window.alert("No Rooms available for Selected Location");
    $("#department-room-div").removeAttr("hidden");
    let optionsToRemove = $("#department-room").find(
      "option:not(:first-child)"
    );
    $(optionsToRemove).remove();
    response.map((data) =>
      $("#department-room").append(
        `<option value="${data._id}">${data.room_number}</option>`
      )
    );
  }

  //validations function
  function checkOperatingTimes(startTime, endTime) {
    let startTimeDT = new Date(`01/01/2023 ${startTime}`);
    let endTimeDT = new Date(`01/01/2023 ${endTime}`);

    return endTimeDT > startTimeDT;
  }

  function checkTime(time) {
    let timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
    if (typeof time !== "string") return false;
    time = time.trim();
    return timeRegex.test(time);
  }
})(window.jQuery);

$(document).ready(function () {
  $("#form-signup").submit(function (event) {
    event.preventDefault();

    $("#error-form").attr("hidden", true);
    let user_email = $("#user_email").val();
    let user_password = $("#user_password").val();
    let user_name = $("#user_name").val();
    let user_department = $("#user_department").val();
    let errors = [];

    if ($.trim(user_name).length === 0) errors.push("Please Insert UserName");
    if ($.trim(user_password).length < 6)
      errors.push("Please Insert Password of length greater than 6");
    if (!validStevensEmail(user_email))
      errors.push("Please Input Proper stevens Email");
    if (user_department === "#")
      errors.push("Please Select proper department From Dropdown");

    if (errors.length > 0) {
      $("#error-form").removeAttr("hidden");
      for (let i = 0; i < errors.length; i++)
        $("#error-form").append(`<p class="error">${errors[i]}</p>`);
    } else {
      $("#error-form").prop("hidden");
      $("#form-signup").off("submit").submit();
    }
  });
});

function validStevensEmail(emailid) {
  let regex = /^[\w._%+-]+(@stevens\.edu)$/;
  return regex.test(emailid);
}

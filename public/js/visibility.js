document.addEventListener("DOMContentLoaded", () => {
    const alertForm = document.getElementById("alert-form");
    const issueForm = document.getElementById("issue-form");
  
    const setupAlertButton = document.getElementById("setup-alert");
    const reportIssueButton = document.getElementById("report-issue");
  
    const cancelAlertButton = document.getElementById("cancel-alert");
    const cancelIssueButton = document.getElementById("cancel-issue");
  
    // Show "Set Up Alert" form and hide "Report Issue" form
    setupAlertButton.addEventListener("click", () => {
      alertForm.classList.remove("hidden");
      issueForm.classList.add("hidden");
    });
  
    // Show "Report Issue" form and hide "Set Up Alert" form
    reportIssueButton.addEventListener("click", () => {
      issueForm.classList.remove("hidden");
      alertForm.classList.add("hidden");
    });
  
    // Hide both forms when canceling
    cancelAlertButton.addEventListener("click", () => {
      alertForm.classList.add("hidden");
    });
  
    cancelIssueButton.addEventListener("click", () => {
      issueForm.classList.add("hidden");
    });
  });
  
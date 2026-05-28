const form = document.querySelector("#uploadForm");
const fileInput = document.querySelector("#documentFile");
const statusMessage = document.querySelector("#mobileStatus");
const submitButton = form.querySelector("button");

function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session");
}

function setMobileStatus(message) {
  statusMessage.textContent = message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const sessionId = getSessionId();
  const file = fileInput.files[0];

  if (!sessionId) {
    setMobileStatus("This scan link is missing a session ID. Please scan the QR code again.");
    return;
  }

  if (!file) {
    setMobileStatus("Choose or capture a document first.");
    return;
  }

  const formData = new FormData();

  submitButton.disabled = true;
  setMobileStatus("Uploading document to the website...");

  try {
    const dataUrl = await readFileAsDataUrl(file);

    const response = await fetch(`/api/scanner/sessions/${sessionId}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Upload failed.");
    }

    setMobileStatus(result.message);
  } catch (error) {
    setMobileStatus(error.message);
    submitButton.disabled = false;
  }
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

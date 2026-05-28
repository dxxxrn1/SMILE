const form = document.querySelector("#uploadForm");
const fileInput = document.querySelector("#documentFile");
const statusMessage = document.querySelector("#mobileStatus");
const submitButton = form.querySelector("button");

async function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  const sessionFromUrl = params.get("session");

  if (sessionFromUrl) {
    return sessionFromUrl;
  }

  const response = await fetch("/api/scanner/current-session");

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.sessionId;
}

function setMobileStatus(message) {
  statusMessage.textContent = message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const sessionId = await getSessionId();
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
    const preparedFile = await prepareFileForUpload(file);

    const response = await fetch(`/api/scanner/sessions/${sessionId}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          name: preparedFile.name,
          type: preparedFile.type,
          size: preparedFile.size,
          dataUrl: preparedFile.dataUrl,
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

async function prepareFileForUpload(file) {
  if (!file.type.startsWith("image/")) {
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file),
    };
  }

  return compressImage(file);
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error("Could not read the selected image."));

    image.onload = () => {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

      resolve({
        name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
        type: "image/jpeg",
        size: Math.round((dataUrl.length * 3) / 4),
        dataUrl,
      });
    };

    image.onerror = () => reject(new Error("Could not prepare the selected image."));
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

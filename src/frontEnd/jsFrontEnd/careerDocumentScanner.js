let careerScanSessionId = null;
let careerScanPollTimer = null;

window.startCareerDocumentScan = async function () {
  const panel = document.getElementById("careerScanPanel");
  const status = document.getElementById("careerScanStatus");
  const link = document.getElementById("careerScanUrl");
  const canvas = document.getElementById("careerScanQr");

  if (!panel || !status || !link || !canvas) {
    return;
  }

  panel.style.display = "grid";
  status.textContent = "Creating secure scan link...";
  link.textContent = "";

  if (careerScanPollTimer) {
    clearInterval(careerScanPollTimer);
  }

  try {
    const response = await fetch("/api/scanner/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Could not create scan session.");
    }

    const session = await response.json();
    careerScanSessionId = session.sessionId;
    link.href = session.scanUrl;
    link.textContent = session.scanUrl;

    if (session.qrDataUrl) {
      await drawQrDataUrl(canvas, session.qrDataUrl);
    } else if (window.QRCode) {
      await window.QRCode.toCanvas(canvas, session.scanUrl, {
        width: 160,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
    }

    status.textContent = "Scan this QR code with your phone, then upload the document.";
    careerScanPollTimer = setInterval(checkCareerScanStatus, 2000);
  } catch (error) {
    status.textContent = error.message;
  }
};

function drawQrDataUrl(canvas, dataUrl) {
  return new Promise((resolve, reject) => {
    const context = canvas.getContext("2d");
    const image = new Image();

    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve();
    };

    image.onerror = () => reject(new Error("Could not draw QR code."));
    image.src = dataUrl;
  });
}

async function checkCareerScanStatus() {
  if (!careerScanSessionId) {
    return;
  }

  const status = document.getElementById("careerScanStatus");

  try {
    const response = await fetch(`/api/scanner/sessions/${careerScanSessionId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Scan session expired. Please create a new scan link.");
    }

    const session = await response.json();

    if (session.status === "waiting_for_phone") {
      status.textContent = "Waiting for the phone upload...";
      return;
    }

    clearInterval(careerScanPollTimer);

    if (session.status === "rejected_document") {
      status.textContent = session.analysis?.message || "That document was not accepted.";
      return;
    }

    if (session.status === "school_document_ready") {
      status.textContent = "Document accepted. Asking SMILE Career AI for your career path...";
      await sendScannedDocumentToCareerBot(session.analysis);
    }
  } catch (error) {
    clearInterval(careerScanPollTimer);
    status.textContent = error.message;
  }
}

async function sendScannedDocumentToCareerBot(analysis) {
  const chatSection = document.getElementById("chatSection");
  const quizStatusCard = document.getElementById("quizStatusCard");
  const input = document.getElementById("chatInput");
  const downloadDocBtn = document.getElementById("downloadDocBtn");

  if (quizStatusCard) {
    quizStatusCard.style.display = "none";
  }

  if (chatSection) {
    chatSection.style.display = "flex";
  }

  if (downloadDocBtn) {
    downloadDocBtn.style.display = "inline-flex";
  }

  if (!input || !analysis?.chatbotPrompt) {
    return;
  }

  input.value = analysis.chatbotPrompt;

  if (typeof window.sendChat === "function") {
    await window.sendChat();
  }
}

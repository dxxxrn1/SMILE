const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector("#statusDot");
const scanUrlLink = document.querySelector("#scanUrl");
const resultBox = document.querySelector("#resultBox");
const resultTitle = document.querySelector("#resultTitle");
const resultMessage = document.querySelector("#resultMessage");
const documentType = document.querySelector("#documentType");
const confidence = document.querySelector("#confidence");
const grade = document.querySelector("#grade");
const subjectsList = document.querySelector("#subjectsList");
const careerList = document.querySelector("#careerList");
const chatbotPrompt = document.querySelector("#chatbotPrompt");

let sessionId = null;
let pollTimer = null;

async function createScanSession() {
  const response = await fetch("/api/scanner/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not create scan session.");
  }

  return response.json();
}

async function renderQrCode(scanUrl) {
  const canvas = document.querySelector("#qrCode");

  if (!window.QRCode) {
    canvas.replaceWith(document.createTextNode(scanUrl));
    return;
  }

  await window.QRCode.toCanvas(canvas, scanUrl, {
    width: 240,
    margin: 1,
    color: {
      dark: "#172033",
      light: "#ffffff",
    },
  });
}

async function pollSession() {
  if (!sessionId) {
    return;
  }

  const response = await fetch(`/api/scanner/sessions/${sessionId}`);

  if (!response.ok) {
    setStatus("Scan session expired. Please refresh and try again.", "rejected");
    clearInterval(pollTimer);
    return;
  }

  const session = await response.json();

  if (session.status === "waiting_for_phone") {
    setStatus("Waiting for the phone upload...", "");
    return;
  }

  clearInterval(pollTimer);

  if (session.status === "school_document_ready") {
    setStatus("School document received.", "ready");
    renderAnalysis(session.analysis);
  } else if (session.status === "rejected_document") {
    setStatus("Document received, but it was not accepted.", "rejected");
    renderAnalysis(session.analysis);
  }
}

function setStatus(message, state) {
  statusText.textContent = message;
  statusDot.className = `status-dot ${state || ""}`.trim();
}

function renderAnalysis(analysis) {
  resultBox.classList.remove("hidden");
  resultTitle.textContent = analysis.isSchoolDocument ? "School document accepted" : "Document needs another scan";
  resultMessage.textContent = analysis.message;
  documentType.textContent = analysis.documentType;
  confidence.textContent = `${Math.round(analysis.confidence * 100)}%`;
  grade.textContent = analysis.grade;

  subjectsList.innerHTML = "";
  if (analysis.subjects.length === 0) {
    subjectsList.append(createListItem("No subjects were detected yet."));
  } else {
    analysis.subjects.forEach((subject) => {
      subjectsList.append(createListItem(`${subject.name}: ${subject.mark}%`));
    });
  }

  careerList.innerHTML = "";
  if (analysis.careerPaths.length === 0) {
    careerList.append(createListItem("No career paths generated because the document was not accepted."));
  } else {
    analysis.careerPaths.forEach((career) => {
      careerList.append(createListItem(career));
    });
  }

  chatbotPrompt.value = analysis.chatbotPrompt || "Scan a valid school document before sending details to the chatbot.";
}

function createListItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

async function init() {
  try {
    setStatus("Creating secure scan link...", "");
    const session = await createScanSession();
    sessionId = session.sessionId;

    scanUrlLink.href = session.scanUrl;
    scanUrlLink.textContent = session.scanUrl;
    await renderQrCode(session.scanUrl);

    setStatus("Waiting for the phone upload...", "");
    pollTimer = setInterval(pollSession, 2000);
  } catch (error) {
    setStatus(error.message, "rejected");
  }
}

init();


import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const loading = document.getElementById("loading");
const cameraSelect = document.getElementById("camera-select");
const spelledWordEl = document.getElementById("spelled-word");
const detectedLetterEl = document.getElementById("detected-letter");
const clearWordBtn = document.getElementById("clear-word-btn");
const registerBtn = document.getElementById("register-btn");
const statusMessage = document.getElementById("status-message");
const namesList = document.getElementById("registered-names-list");
const gestureFeedback = document.getElementById("gesture-feedback");
const easterEggImg = document.getElementById("easter-egg-img");
const easterEggAudio = document.getElementById("easter-egg-audio");
const videoContainer = document.querySelector(".video-container");

let handLandmarker = undefined;
let webcamRunning = false;
let currentWord = "";
let lastValidLetter = "-";
let waitingForFist = false;
let isEasterEggActive = false;

// 1 = Finger Open, 0 = Finger Closed
const ALPHABET = [
    {"letter":"A","MENIQUE_IZQ":1,"ANULAR_IZQ":0,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"B","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"C","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"D","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"E","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":1,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"F","MENIQUE_IZQ":1,"ANULAR_IZQ":0,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":1},
    {"letter":"G","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":1},
    {"letter":"H","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":1},
    {"letter":"I","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":1},
    {"letter":"J","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":1,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":1},
    {"letter":"K","MENIQUE_IZQ":1,"ANULAR_IZQ":0,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":0},
    {"letter":"L","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":0},
    {"letter":"M","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":0},
    {"letter":"N","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":0},
    {"letter":"O","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":1,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":0},
    {"letter":"P","MENIQUE_IZQ":1,"ANULAR_IZQ":0,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":1,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"Q","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":1,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"R","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":1,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"S","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":0,"MENIQUE_DER":1,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"T","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":1,"MENIQUE_DER":1,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":0,"PULGAR_DER":0},
    {"letter":"U","MENIQUE_IZQ":1,"ANULAR_IZQ":0,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":1},
    {"letter":"V","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":1},
    {"letter":"W","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":1},
    {"letter":"X","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":0,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":1},
    {"letter":"Y","MENIQUE_IZQ":1,"ANULAR_IZQ":1,"MEDIO_IZQ":1,"INDICE_IZQ":1,"PULGAR_IZQ":1,"MENIQUE_DER":0,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":1},
    {"letter":"Z","MENIQUE_IZQ":1,"ANULAR_IZQ":0,"MEDIO_IZQ":0,"INDICE_IZQ":0,"PULGAR_IZQ":0,"MENIQUE_DER":1,"ANULAR_DER":0,"MEDIO_DER":0,"INDICE_DER":1,"PULGAR_DER":1}
];

const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
    });
    loading.style.display = "none";
    initCameras();
};

createHandLandmarker();

async function initCameras() {
    try {
        // Request permission first so enumerateDevices can get labels
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        cameraSelect.innerHTML = '';
        if (videoDevices.length === 0) {
            cameraSelect.innerHTML = '<option>No cameras found</option>';
            return;
        }

        videoDevices.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.text = camera.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });

        startCamera(videoDevices[0].deviceId);
    } catch (err) {
        console.error("Error accessing cameras: ", err);
        cameraSelect.innerHTML = '<option>Camera Access Denied</option>';
    }
}

cameraSelect.addEventListener('change', (e) => {
    if(e.target.value) startCamera(e.target.value);
});

async function startCamera(deviceId) {
    if (webcamRunning && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: { 
            deviceId: { exact: deviceId },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 60 }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
        webcamRunning = true;
    });
}

function isFingerOpen(landmarks, tipIndex, dipIndex) {
    return landmarks[tipIndex].y < landmarks[dipIndex].y ? 1 : 0;
}

function getThumbState(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const pinkyBase = landmarks[17];
    
    const distTip = Math.hypot(thumbTip.x - pinkyBase.x, thumbTip.y - pinkyBase.y);
    const distIP = Math.hypot(thumbIP.x - pinkyBase.x, thumbIP.y - pinkyBase.y);
    
    return distTip > distIP ? 1 : 0;
}

function getHandFingersState(landmarks) {
    return {
        PULGAR: getThumbState(landmarks),
        INDICE: isFingerOpen(landmarks, 8, 6),
        MEDIO: isFingerOpen(landmarks, 12, 10),
        ANULAR: isFingerOpen(landmarks, 16, 14),
        MENIQUE: isFingerOpen(landmarks, 20, 18)
    };
}

let lastVideoTime = -1;
async function predictWebcam() {
    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }
    
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, startTimeMs);
        
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        let state = {
            MENIQUE_IZQ: 0, ANULAR_IZQ: 0, MEDIO_IZQ: 0, INDICE_IZQ: 0, PULGAR_IZQ: 0,
            MENIQUE_DER: 0, ANULAR_DER: 0, MEDIO_DER: 0, INDICE_DER: 0, PULGAR_DER: 0
        };

        if (results.landmarks && results.landmarks.length > 0) {
            let allFingersOpen = true;

            for (let i = 0; i < results.landmarks.length; i++) {
                const landmarks = results.landmarks[i];
                const handedness = results.handednesses[i][0].categoryName; 
                const isLeft = handedness === "Left"; 
                
                const fState = getHandFingersState(landmarks);
                
                // If any finger is 0 on any detected hand, allFingersOpen is false
                if (Object.values(fState).some(val => val === 0)) {
                    allFingersOpen = false;
                }
                
                if (isLeft) { 
                    state.MENIQUE_IZQ = fState.MENIQUE;
                    state.ANULAR_IZQ = fState.ANULAR;
                    state.MEDIO_IZQ = fState.MEDIO;
                    state.INDICE_IZQ = fState.INDICE;
                    state.PULGAR_IZQ = fState.PULGAR;
                } else {
                    state.MENIQUE_DER = fState.MENIQUE;
                    state.ANULAR_DER = fState.ANULAR;
                    state.MEDIO_DER = fState.MEDIO;
                    state.INDICE_DER = fState.INDICE;
                    state.PULGAR_DER = fState.PULGAR;
                }

                // Draw only the fingertips (4, 8, 12, 16, 20) with glowing style
                const tipIndices = [4, 8, 12, 16, 20];
                for (const idx of tipIndices) {
                    const landmark = landmarks[idx];
                    canvasCtx.beginPath();
                    canvasCtx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, 6, 0, 2 * Math.PI);
                    canvasCtx.fillStyle = "#8b5cf6";
                    canvasCtx.shadowBlur = 15;
                    canvasCtx.shadowColor = "#8b5cf6";
                    canvasCtx.fill();
                }
            }
            
            // Easter Egg Logic
            if (allFingersOpen) {
                if (!isEasterEggActive) {
                    isEasterEggActive = true;
                    videoContainer.classList.add("bw-filter");
                    easterEggImg.classList.add("show");
                    easterEggAudio.play().catch(e => console.log("Audio play prevented by browser", e));
                }
            } else {
                if (isEasterEggActive) {
                    isEasterEggActive = false;
                    videoContainer.classList.remove("bw-filter");
                    easterEggImg.classList.remove("show");
                    easterEggAudio.pause();
                    easterEggAudio.currentTime = 0;
                }
            }
            
            if (!isEasterEggActive) {
                detectLetter(state);
            }
        } else {
            // No hands
            if (isEasterEggActive) {
                isEasterEggActive = false;
                videoContainer.classList.remove("bw-filter");
                easterEggImg.classList.remove("show");
                easterEggAudio.pause();
                easterEggAudio.currentTime = 0;
            }
            gestureFeedback.textContent = "Waiting for hands...";
            gestureFeedback.className = "gesture-feedback";
        }
        canvasCtx.restore();
    }
    
    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function detectLetter(currentState) {
    // Check if ALL fingers are closed (0) -> this is our FIST trigger to ADD letter
    const isFist = Object.values(currentState).every(val => val === 0);

    if (isFist) {
        if (waitingForFist && lastValidLetter !== "-") {
            // Add the letter!
            currentWord += lastValidLetter;
            updateWordUI();
            
            // Visual feedback
            gestureFeedback.textContent = `Added "${lastValidLetter}"!`;
            gestureFeedback.className = "gesture-feedback added";
            
            // Reset state to avoid double triggering
            waitingForFist = false;
            lastValidLetter = "-";
            detectedLetterEl.textContent = "-";
        } else {
            gestureFeedback.textContent = "Release fist to detect new letter";
        }
        return;
    }

    // Try to match a letter
    let bestMatch = "-";
    for (const item of ALPHABET) {
        if (
            item.MENIQUE_IZQ === currentState.MENIQUE_IZQ &&
            item.ANULAR_IZQ === currentState.ANULAR_IZQ &&
            item.MEDIO_IZQ === currentState.MEDIO_IZQ &&
            item.INDICE_IZQ === currentState.INDICE_IZQ &&
            item.PULGAR_IZQ === currentState.PULGAR_IZQ &&
            item.MENIQUE_DER === currentState.MENIQUE_DER &&
            item.ANULAR_DER === currentState.ANULAR_DER &&
            item.MEDIO_DER === currentState.MEDIO_DER &&
            item.INDICE_DER === currentState.INDICE_DER &&
            item.PULGAR_DER === currentState.PULGAR_DER
        ) {
            bestMatch = item.letter;
            break;
        }
    }
    
    if (bestMatch !== "-") {
        lastValidLetter = bestMatch;
        detectedLetterEl.textContent = bestMatch;
        waitingForFist = true; // Ready to be added when fist is made
        gestureFeedback.textContent = `Detected "${bestMatch}" - Make a Fist to Add`;
        gestureFeedback.className = "gesture-feedback active";
    } else {
        if(waitingForFist) {
            gestureFeedback.textContent = `Holding "${lastValidLetter}" - Make a Fist to Add`;
        } else {
            gestureFeedback.textContent = "Gesture not recognized";
            gestureFeedback.className = "gesture-feedback";
        }
    }
}

// UI Actions
clearWordBtn.addEventListener("click", () => {
    currentWord = "";
    updateWordUI();
});

function updateWordUI() {
    spelledWordEl.textContent = currentWord;
    registerBtn.disabled = currentWord.length < 4;
}

function showMessage(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.className = `status-message ${type} show`;
    setTimeout(() => {
        statusMessage.className = `status-message ${type}`;
    }, 3000);
}

registerBtn.addEventListener("click", () => {
    if (currentWord.length >= 4) {
        fetch("/api/names", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: currentWord })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showMessage("Identity Registered Successfully!", "success");
                currentWord = "";
                updateWordUI();
                loadNames();
            } else {
                showMessage(data.error, "error");
            }
        })
        .catch(err => {
            showMessage("Error saving identity.", "error");
        });
    }
});

function loadNames() {
    fetch("/api/names")
    .then(res => res.json())
    .then(names => {
        namesList.innerHTML = "";
        names.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.name;
            namesList.appendChild(li);
        });
    });
}

// Initial load
loadNames();

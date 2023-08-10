// some are from https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/api-samples/tabCapture/receiver.js
let popUpMsg = document.getElementById("message");

let mediaRecorder, chunks = [], chunk_map = {}, recordingOrder = [], speeches = {};
let currentStream = null;

let recordingId, recordingStatus = false, playId, ridQ = [];

const mime = 'audio/webm;codecs=opus';

function printErrorMessage(message) {
  popUpMsg.innerText += message;
  console.error(message);
}

// Stop video play-out and stop the MediaStreamTracks.
function shutdownReceiver() {
  currentStream = null;
}

async function workReadyRecorder(targetTabId, consumerTabId) {
  chrome.tabCapture.getMediaStreamId(
    { targetTabId },
    async function (streamId) {
      if (typeof streamId !== 'string') {
        printErrorMessage(
          'Failed to get media stream id: ' +
          (chrome.runtime.lastError.message || 'UNKNOWN')
        );
        return;
      }

      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamId,
          },
        },
        video: false
      });

      const output = new AudioContext();
      const source = output.createMediaStreamSource(media);
      source.connect(output.destination);
    }
  );
}


async function workCapture(targetTabId, consumerTabId) {
  chrome.tabCapture.capture({ audio: true }, (stream) => {
    const output = new AudioContext();
    const source = output.createMediaStreamSource(stream);
    source.connect(output.destination);
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mime,
    });
    mediaRecorder.ondataavailable = (e) => {
      let s = chunks.length;
      chunks.push(e.data);
      chunk_map[recordingId] = [s, chunks.length];
      getNextRecordingId();
    };
    popUpMsg.innerText += "\nRecorder ready";
  });
}

chrome.runtime.onMessage.addListener(function (request) {
  if (request.work === "ready-recording") {
    const { targetTabId, consumerTabId } = request;
    // targetTab: erie; consumerTab: recorder;
    playId = request.pid;
    workCapture(targetTabId, consumerTabId).catch((e) => {
      printErrorMessage(
        'Failed to run stream: ' +
        (e || 'UNKNOWN')
      );
    });
  } else if (request.work === "wrap-recording") {
    returnRecorded();
  } else if (request.work === "start-recording") {
    if (!recordingId) recordingId = request.sid;
    else ridQ.push(request.sid);
    popUpMsg.innerText += "\nRecording started " + request.sid;
    recordingOrder.push(request.sid);
    startRecording();
  } else if (request.work === "stop-recording") {
    popUpMsg.innerText += "\nRecording finished " + request.sid;
    stopRecording();
  } else if (request.work === "track-speech") {
    popUpMsg.innerText += "\nSpeech tracked " + request.sid;
    speeches[request.sid] = request.sound;
    recordingOrder.push(request.sid);
  }
});

function startRecording(id) {
  recordingStatus = true;
  mediaRecorder.start();
}

function stopRecording() {
  recordingStatus = false;
  mediaRecorder.stop();
}

function getNextRecordingId() {
  if (ridQ.length > 0) recordingId = ridQ.pop();
  else recordingId = undefined;
}


window.addEventListener('beforeunload', shutdownReceiver);

function returnRecorded(e) {
  console.log(chunks, recordingOrder, chunk_map);
  let htmlParts = [];
  for (let id of recordingOrder) {
    if (chunk_map[id]) {
      let [s, e] = chunk_map[id];
      let item = chunks.slice(s, e);
      console.log(id, s, e, item);
      let downloadButton = document.createElement("A");
      downloadButton.innerText = "Download (Audio " + id + ")";
      downloadButton.setAttribute("id", null);
      let filename = audioFileName(id)
      downloadButton.download = filename;
      let blob = new Blob(item, { type: mime });
      let url = URL.createObjectURL(blob);
      downloadButton.setAttribute("href", url);
      document.getElementById("download").append(downloadButton);
      chrome.downloads.download({ url, filename }, (downloadId) => {
        console.log("downloaded: ", downloadId)
      });
      htmlParts.push(makeAudioPart(id));
    } else {
      htmlParts.push(makeSpeechPart(id, speeches[id]));
    }
  }
  let html = makeHTML(playId, htmlParts);
  let htmlBlob = new Blob([html], { type: "text/html" });
  let htmlUrl = URL.createObjectURL(htmlBlob);
  let htmlDownloadButton = document.createElement("A");
  htmlDownloadButton.innerText = "Download (HTML)";
  htmlDownloadButton.setAttribute("id", null);
  let htmlFilename = "erie-doc-" + playId + ".html";
  htmlDownloadButton.download = htmlFilename;
  htmlDownloadButton.setAttribute("href", htmlUrl);
  document.getElementById("download").append(htmlDownloadButton);
  chrome.downloads.download({ url: htmlUrl, filename: htmlFilename }, (downloadId) => {
    console.log("downloaded: ", downloadId)
  });
}

function audioFileName(id) {
  return "erie-rec-" + id + ".webm"
}

const css = `
<style>
body {
  font-family: sans-serif;
}
</style>
`


function makeSpeechPart(sid, part) {
  let rate = 180;
  if (part?.speechRate) rate = Math.round(180 * part.speechRate);
  let language = part?.language ? ` data-lang="${part.language}"` : '';
  let pitch = part?.pitch !== undefined ? ` data-pitch="${part.pitch}"` : '';
  let loudness = part?.loudness !== undefined ? ` data-volume="${part.loudness}"` : '';
  let output =
    `  <p id="speech-${sid}" style="speech-rate: ${rate};" data-web-speech-rate="${part.speechRate || 1}"${language}${pitch}${loudness}>
    ${part.speech}
  </p>`;
  return output;
}

function makeAudioPart(sid) {
  let filename = audioFileName(sid);
  let output =
`  <section>
    <audio id="audio-${sid}" controls>
      <source src="${filename}" type="${mime}">
      Your browser does not support the audio element.
    </audio>
  </section>`;
  return output;
}

function makeHTML(pid, parts) {
  let header =
    `<!DOCTYPE HTML>
<html>
  <head>
    <title>Erie Sonification Output${pid ? ' for ' + pid : ''}</title>
  </head>
  <body>
    <h1>Erie Sonification Output${pid ? ' for ' + pid : ''}</h1>`;
  let body = parts.join("\n");
  let footer =
    `  </body>
</html>`;
  return header + body + footer;
}
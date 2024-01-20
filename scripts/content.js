function connectRecorder() {
  // detect events
  window.soundId = [];
  window.speechId = [];

  // player event
  document.body.addEventListener("erieOnPlayQueue", (e) => {
    console.log(`Recording starts for a sonification. ID: ${e.detail.pid}`);
    window.playId = e.detail.pid;
    // start
    readyRecord(e.detail.pid);
  });

  document.body.addEventListener("erieOnFinishQueue", (e) => {
    if (window.playId === e.detail.pid) {
      console.log(`Recording finishes for a sonification. ID: ${e.detail.pid}`);
    } else {
      console.warn(`The recording did not started properly.`)
    }
    // finish
    wrapRecord(e.detail.pid);
  });

  // tone event
  document.body.addEventListener("erieOnPlayTone", (e) => {
    console.log(`Part-recording starts for tone. ID: ${e.detail.sid}`);
    window.soundId.push(e.detail.sid);
    if (soundId.length == 1) {
      // start;
      startRecord(e.detail.sid);
    }
  });

  document.body.addEventListener("erieOnFinishTone", (e) => {
    if (window.soundId.includes(e.detail?.sid)) {
      console.log(`Part-recording finishes for tone. ID: ${e.detail.sid}`);
      window.soundId.splice(soundId.indexOf(e.detail.sid), 1);
      if (window.soundId.length == 0) {
        // finish;
        finishRecord(e.detail.sid);
      }
    } else {
      console.warn(`The part-recording did not started properly.`)
    }
  });

  // speech event
  document.body.addEventListener("erieOnPlaySpeech", (e) => {
    console.log(`Part-recording starts for speech. ID: ${e.detail.sid}`);
    window.speechId.push(e.detail.sid);
    if (window.speechId.length == 1) {
      // start;
      trackSpeech(e.detail.sid, e.detail.sound)
    }
  });

  document.body.addEventListener("erieOnFinishSpeech", (e) => {
    if (speechId.includes(e.detail.sid)) {
      console.log(`Part-recording finishes for speech. ID ${e.detail.sid}`);
      window.speechId.splice(speechId.indexOf(e.detail.sid), 1);
    } else {
      console.warn(`The part-recording did not started properly.`)
    }
  });

  let readyEvent = new Event("erieOnRecorderReady");
  document.body.dispatchEvent(readyEvent);
  window.erieRecorderReady = true;
}

function readyRecord(pid) {
  console.log("rec-ready");
  chrome.runtime.sendMessage({
    workGroup: "recording",
    work: "ready-recording",
    pid
  });
}

function wrapRecord(pid) {
  console.log("rec-wrap");
  chrome.runtime.sendMessage({
    workGroup: "recording",
    work: "wrap-recording",
    pid
  });
}

function startRecord(sid) {
  console.log("rec-start");
  chrome.runtime.sendMessage({
    workGroup: "recording",
    work: "start-recording",
    sid
  });
}

function finishRecord(sid) {
  console.log("rec-stop");
  chrome.runtime.sendMessage({
    workGroup: "recording",
    work: "stop-recording",
    sid
  });
}

function trackSpeech(sid, sound) {
  console.log("rec-speech");
  chrome.runtime.sendMessage({
    workGroup: "recording",
    work: "track-speech",
    sid,
    sound
  });
}

async function setup(request) {
  connectRecorder();
  console.log("recorder-connected");
}

setup();
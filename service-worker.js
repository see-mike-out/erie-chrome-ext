// https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/api-samples/tabCapture/service-worker.js

async function closePrevPopup() {
  const tabs = await chrome.tabs.query({
    url: chrome.runtime.getURL('recorder_popup.html')
  });

  await Promise.all(tabs.map((tab) => chrome.tabs.remove(tab.id)));
}

chrome.action.onClicked.addListener(async (tab) => {
  const currentTabId = tab.id;

  await closePrevPopup();

  // Open a new tab with the recorder_popup.html page
  const { tabs } = await chrome.windows.create({
    url: chrome.runtime.getURL('recorder_popup.html'),
    type: "popup",
    width: 300,
    height: 300
  });

  const recorderTabId = tabs[0].id;

  // Wait for the recorder tab to load
  await new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === recorderTabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });

  // Send a message to the receiver tab
  chrome.tabs.sendMessage(recorderTabId, {
    targetTabId: currentTabId,
    consumerTabId: recorderTabId
  });
});
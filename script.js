const year = document.querySelector("#year");

if (year) {
  year.textContent = new Date().getFullYear();
}

/*
  Later vervangen we deze URL door jouw echte
  Chrome Web Store link.
*/

const chromeWebStoreUrl =
  "https://chromewebstore.google.com/detail/trading-island/gccchgbcmjkkabhdimacgijmgdmklgaf";

const chromeButton = document.querySelector("#chromeButton");
const chromeButtonBottom =
  document.querySelector("#chromeButtonBottom");

function openChromeStore(event) {
  event.preventDefault();

  if (chromeWebStoreUrl === "#") {
    alert(
      "Trading Island is available on the Chrome Web Store. " +
      "The store link will be added here shortly."
    );

    return;
  }

  window.open(
    chromeWebStoreUrl,
    "_blank",
    "noopener,noreferrer"
  );
}

if (chromeButton) {
  chromeButton.addEventListener("click", openChromeStore);
}

if (chromeButtonBottom) {
  chromeButtonBottom.addEventListener(
    "click",
    openChromeStore
  );
}

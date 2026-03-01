var popup = document.getElementById('popup');

var yesButton = document.getElementById("popupYesButton");
var okButton = document.getElementById("popupOkButton");
var noButton = document.getElementById("popupNoButton");
var cancleButton = document.getElementById("popupCancleButton");
var endButton = document.getElementById("popupEndButton");

var textElem = document.getElementById("popupText");

var popupOnYes;
var popupOnOk;
var popupOnNo;
var popupOnCancle;

class Popup {

    static async showYesNo(text, onYes, onNo) {
        popup.style.display = 'inherit';

        yesButton.style.display = "";
        noButton.style.display = "";

        textElem.innerHTML = text;

        popupOnYes = onYes;
        popupOnNo = onNo;
    }

    static async showOkCancle(text, onOk, onCancle) {
        popup.style.display = 'inherit';

        okButton.style.display = "";
        cancleButton.style.display = "";

        text.innerHTML = text;

        popupOnOk = onOk;
        popupOnCancle = onCancle;
    }

    static async showOk(text, onOk) {
        popup.style.display = 'inherit';

        okButton.style.display = "";

        text.innerHTML = text;

        popupOnOk = onOk;
    }

    static onYes() { if (popupOnYes != null) popupOnYes(); Popup.close(); }

    static onOk() { if (popupOnOk != null) popupOnOk(); Popup.close(); }

    static onNo() { if (popupOnNo != null) popupOnNo(); Popup.close(); }

    static onCancle() { if (popupOnCancle != null) popupOnCancle(); Popup.close(); }

    static close() {
        popupOnYes = null;
        popupOnOk = null;
        popupOnNo = null;
        popupOnCancle = null;

        yesButton.style.display = "none";
        okButton.style.display = "none";
        noButton.style.display = "none";
        cancleButton.style.display = "none";

        popup.style.display = 'none';
    }
}

Popup.close();

export default Popup;
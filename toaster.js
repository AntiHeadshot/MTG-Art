
let toastTimeout;

class Toaster {
    static show(message, progress) {
        var toaster = document.getElementById('toaster');
        document.getElementById('toasterMessage').textContent = message;
        toaster.classList.add("show");

        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        if (progress !== undefined)
            document.getElementById('toasterProgressBar').style.width = (progress * 100) + '%';

        toastTimeout = setTimeout(function () {
            toaster.classList.remove("show");
        }, 3000);
    }

    static hide() {
        document.getElementById('toaster').classList.remove("show");
    }
}

export default Toaster;
export { Toaster };
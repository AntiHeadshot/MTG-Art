
let toastTimeout;

class Toaster {
    static show(message, progress) {
        var toaster = document.getElementById('toaster');
        document.getElementById('toasterMessage').textContent = message;
        toaster.classList.add("show");
        toaster.classList.remove("error");

        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        toaster.classList.toggle("progress", progress !== undefined);
        if (progress !== undefined)
            document.getElementById('toasterProgressBar').style.width = (progress * 100) + '%';

        toastTimeout = setTimeout(function () {
            toaster.classList.remove("show");
        }, 3000);
    }

    static showError(message) {
        var toaster = document.getElementById('toaster');
        document.getElementById('toasterMessage').textContent = message;
        toaster.classList.add("show", "error");
        toaster.classList.remove("progress");

        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        toastTimeout = setTimeout(function () {
            toaster.classList.remove("show");
        }, 5000);
    }

    static hide() {
        document.getElementById('toaster').classList.remove("show");
    }
}

export default Toaster;
export { Toaster };
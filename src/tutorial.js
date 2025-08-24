import Events from "./events.js";

let rejectLast = null;

let tutorialSteps = [];

let currentStep = 0;
let lastTarget = null;
let lastTargetZ = 0;
let isOpen = false;
let observerTimer = null;

let prevButton = document.getElementById("prevButton");
let nextButton = document.getElementById("nextButton");

class Tutorial {

    static async showPopup(text) {
        document.getElementById('tutorial').style.display = 'inherit';
        isOpen = true;

        const tutorialFrame = document.getElementById('tutorialFrame');
        const tutorialText = document.getElementById('tutorialText');
        const endButton = document.getElementById('endButton');

        tutorialText.innerHTML = text;
        tutorialFrame.style.display = 'none';

        prevButton.disabled = true;
        nextButton.disabled = true;       

        function handleClose() {
            document.getElementById('tutorial').style.display = 'none';
            isOpen = false;
            endButton.removeEventListener('mousedown', handleClose);
            tutorialFrame.style.display = 'block';
        }
        endButton.addEventListener('mousedown', handleClose);
    }

    static start() {
        document.getElementById('tutorial').style.display = 'inherit';
        isOpen = true;

        Events.dispatch(Events.Type.TutorialStarted);

        currentStep = 0;
        this.showStep(currentStep);
    }

    static addStep(step) {
        tutorialSteps.push(step);
    }

    static get isOpen() {
        return isOpen;
    }

    static async showStep(step, evt) {
        if (rejectLast) {
            rejectLast();
            rejectLast = null;
        }
        const { getElement, getFrameElement, text, continueAfter, canSkip } = tutorialSteps[step];
        const targetElement = await getElement();
        const targetFrameElement = getFrameElement ? await getFrameElement() : targetElement;

        const tutorialFrame = document.getElementById('tutorialFrame');
        const tutorialText = document.getElementById('tutorialText');

        nextButton.disabled = false;
        prevButton.disabled = currentStep < 1;
        nextButton.innerText = currentStep < tutorialSteps.length - 1 ? "Next" : "Finish";

        if (lastTarget)
            lastTarget.style.zIndex = lastTargetZ;

        if (targetElement) {
            tutorialText.innerHTML = text;

            lastTargetZ = targetElement.style.zIndex;
            targetElement.style.zIndex = 20001;
            lastTarget = targetElement;

            tutorialFrame.style.borderRadius = `${parseFloat(getComputedStyle(targetFrameElement).borderRadius) + 2}px`;

            function updateFramePosition() {
                if (targetElement.style.zIndex != 20001)
                    lastTargetZ = targetElement.style.zIndex;
                targetElement.style.zIndex = 20001;

                const rect = targetFrameElement.getBoundingClientRect();
                tutorialFrame.style.top = `${rect.top + window.scrollY}px`;
                tutorialFrame.style.left = `${rect.left + window.scrollX}px`;
                tutorialFrame.style.width = `${rect.width}px`;
                tutorialFrame.style.height = `${rect.height}px`;
            }

            clearInterval(observerTimer);
            observerTimer = setInterval(updateFramePosition, 200);

            if (continueAfter != null) {
                document.getElementById('nextButton').disabled = canSkip == null || !canSkip();

                try {
                    await continueAfter(evt);
                    clearInterval(observerTimer);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.nextStep();
                }
                catch (error) { /*common if cancled*/
                    console.log(error)
                }
            }
            else
                document.getElementById('nextButton').disabled = false;
        }
    }

    static async nextStep(evt) {
        if (currentStep < tutorialSteps.length - 1) {
            currentStep++;
            await this.showStep(currentStep, evt);
        } else
            this.end();
    }

    static async prevStep(evt) {
        if (currentStep > 0) {
            currentStep--;
            await this.showStep(currentStep, evt);
        }
    }

    static end() {
        if(!isOpen)
            return;

        Events.dispatch(Events.Type.TutorialEnded);

        document.getElementById('tutorial').style.display = 'none';
        currentStep = 0;

        if (observerTimer)
            clearInterval(observerTimer);

        if (lastTarget)
            lastTarget.style.zIndex = "";
        localStorage.setItem('finishedTutorial', true);
        isOpen = false;
        window.location.reload();
    }

    static waitForEvent(eventType, callback, callBeforeWait) {
        return new Promise((resolve, reject) => {
            rejectLast = reject;
            function resolveThis(evt) {
                if (callback)
                    callback(evt?.data);
                Events.remove(eventType, resolveThis);
                rejectLast = null;
                resolve();
            }

            Events.on(eventType, resolveThis);
            if (callBeforeWait)
                callBeforeWait();
        })
    }
}

export default Tutorial;
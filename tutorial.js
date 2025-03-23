let tutorialSteps = [
    {
        getElement: () => document.querySelector('.CodeMirror'),
        text: `Input your deck here. You can type or paste your deck list into this field. Each card should be on a new line and if no count is given a single card is assumed.<br><br>Possible Inputs are
<br>
<br> // Comments with leading "//"
<br>
<br> A list of cards from deckstats.net
<br>1 [CMR#656] Vampiric Tutor
<br>2 [TMH3#2] Eldrazi Spawn
<br>
<br> A link to a public deck on deckstats.net (only if it is the first and only line)
<br>https://deckstats.net/decks/276918/3990370-rawr-from-the-dead/en
<br>
<br> A list of cards from mtgprint.net
<br>1 Legion's Landing // Adanto, the First Fort (PXTC) 22
<br>2 Vampiric Tutor (CMR) 656
<br>
<br> Alink to a card on scryfall.com
<br>1 https://scryfall.com/card/cmr/656/vampiric-tutor
<br>2 https://scryfall.com/card/totc/10/zombie?utm_source=api
<br>
<br> Card names and count without set names. Be carefull to select the correct card when the name is red. 
<br>1 Vampiric Tutor
<br>2 Eldrazi Spawn`,
    },
    {
        getElement: async () => {
            console.log(document.querySelector('.CodeMirror'));

            let template = await fetch('placeholder.txt');
            document.querySelector('.CodeMirror').CodeMirror.doc.setValue(await template.text());

            return document.querySelector('#loadDeck')
        },
        text: 'Followed by loading the deck. This will try to recognize every card and prioritize set and the number of the card over the name.<br><br>Entries like "1 Vampire" will be treated as unspecified as long as you do not change the card. Be careful to select the correct card you want.<br><br>While loading you can see the progress in the text field and the toaster in the bottom right corner.<br><br><br>Click "Load Deck" to continue.',
        continueAfter: async () => {
            return new Promise(() => {
                
                resolve();
            }
            );
        }
    },
    {
        getElement: () => document.querySelector('#artViewButton'),
        text: 'This is the art view button. Click here to switch to the art view.',
    },
    {
        getElement: () => document.querySelector('#pdfButton'),
        text: 'This is the PDF button. Click here to switch to the PDF view.',
    },
    {
        getElement: () => document.querySelector('#deckContainer'),
        text: 'This is the deck container. Here you can load and manage your deck.',
    },
    {
        getElement: () => document.querySelector('#pdfContainer'),
        text: 'This is the PDF container. Here you can configure and generate your PDF.',
    },
];

let currentStep = 0;
let lastTarget = null;
let isOpen = false;

class Tutorial {
    static async start() {
        document.getElementById('tutorialOverlay').style.display = 'flex';
        document.getElementById('tutorialContentContainer').style.display = 'flex';
        isOpen = true;
        await this.showStep(currentStep);
    }

    static get isOpen() {
        return isOpen;
    }

    static async showStep(step) {
        const { getElement, text, condition } = tutorialSteps[step];
        const targetElement = await getElement();
        const tutorialFrame = document.getElementById('tutorialFrame');
        const tutorialText = document.getElementById('tutorialText');

        if (lastTarget)
            lastTarget.style.zIndex = "";

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            tutorialText.innerHTML = text;
            tutorialFrame.style.top = `${rect.top + window.scrollY}px`;
            tutorialFrame.style.left = `${rect.left + window.scrollX}px`;
            tutorialFrame.style.width = `${rect.width}px`;
            tutorialFrame.style.height = `${rect.height}px`;
            targetElement.style.zIndex = 20001;
            lastTarget = targetElement;
        }
    }

    static async nextStep() {
        if (currentStep < tutorialSteps.length - 1) {
            currentStep++;
            await this.showStep(currentStep);
        } else
            this.end();
    }

    static async prevStep() {
        if (currentStep > 0) {
            currentStep--;
            await this.showStep(currentStep);
        }
    }

    static end() {
        document.getElementById('tutorialOverlay').style.display = 'none';
        document.getElementById('tutorialContentContainer').style.display = 'none';
        currentStep = 0;
        if (lastTarget)
            lastTarget.style.zIndex = "";
        localStorage.setItem('finishedTutorial', true);
        isOpen = false;
    }
}

export default Tutorial;
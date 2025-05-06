import Tutorial from "./tutorial.js";
import { scrollTo } from "./scroll.js";
import View from "./view.js";
import Events from "./events.js";

let isDeckLoaded = false;
let selectedCard = null;
let changedCard = false;
let revertedCard = false;
let flippedCard = false;
let triedFilters = false;

let popup;
function scrapeScryfall(evt) { popup = evt.data; };

Events.on(Events.Type.TutorialStarted, () => Events.on(Events.Type.ScryfallOpened, scrapeScryfall));
Events.on(Events.Type.TutorialEnded, () => Events.remove(Events.Type.ScryfallOpened, scrapeScryfall));

Tutorial.addStep({
    getElement: () => document.querySelector('#tutorialContent'),
    text: `Welcome
<br>
<br>You can start the tutorial again anytime, if you want.`,
});

Tutorial.addStep({
    getElement: () => document.querySelector('.CodeMirror'),
    text: `Input your deck here. You can type or paste your deck list into this field. Each card should be on a new line and if no count is given, a single card is assumed.
<br>
<br>Your deck will be <b>automatically saved</b> and loaded again when you reload or revisit this site.
<br>
<br>Possible Inputs are:
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
<br> A link to a card on scryfall.com
<br>1 https://scryfall.com/card/cmr/656/vampiric-tutor
<br>2 https://scryfall.com/card/totc/10/zombie?utm_source=api
<br>
<br> Card names and count without set names. Be careful to select the correct card when the name is red. 
<br>1 Vampiric Tutor
<br>2 Eldrazi Spawn`,
});

Tutorial.addStep({
    getElement: async () => {
        let template = await fetch('assets/placeholder.txt');
        document.querySelector('.CodeMirror').CodeMirror.doc.setValue(await template.text());

        return document.querySelector('#loadDeck')
    },
    text: `You then continue with loading the deck. We try to recognize every card.
<br>Set and the number of the card will be prioritized over the name.
<br>
<br>Entries like "1 Vampire" will be treated as unspecified as long as you do not change the card. Be careful to select the correct card you want.
<br>
<br>While loading, you can see the progress in the text field and the toaster in the bottom right corner.
<br>
<br>You can load the deck once. If you want to load another deck, press F5.
<br>
<br>To continue, click "Load Deck" and wait until it has finished.`,
    continueAfter: () => Tutorial.waitForEvent(Events.Type.DeckLoaded, () => isDeckLoaded = true),
    canSkip: () => isDeckLoaded,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#cards'),
    text: `In this view, all the cards are displayed on the left.
<br>You can scroll through them and see which card you are hovering over in the input field.
<br>
<br>You can also scroll to a card by clicking on its entry in the input field.
<br>Try this next.`,
});

Tutorial.addStep({
    getElement: () => document.querySelector('.CodeMirror'),
    text: 'Click on an entry for a card to scroll to its position',
    continueAfter: () => Tutorial.waitForEvent(Events.Type.ScrollingToCard, c => selectedCard = c),
    canSkip: () => selectedCard != null,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#' + selectedCard.elem.id),
    text: `You can edit a card by clicking on it.
<br>This will open Scryfall with a matching search result.
<br>
<br>When a card is selected, you can drag an image from Scryfall on this page to change the currently selected card.
<br>
<br>You can drag an image directly from the search result or the details page of a card.
<br>
<br>Click on the card and change it afterward.
    `,
    continueAfter: async () => {
        scrollTo(document.querySelector('#' + selectedCard.elem.id).card);

        await Tutorial.waitForEvent(Events.Type.CardChanged, () => {
            popup.location = window.location;
            popup.close();
            changedCard = true;
        })
    },
    canSkip: () => changedCard
});

Tutorial.addStep({
    getElement: () => document.querySelector('#' + selectedCard.elem.id),
    getFrameElement: () => document.querySelector('#' + selectedCard.elem.id + (selectedCard.history.length ? " .rollbackSvg" : " .forwardSvg")),
    text: `Now that you changed a card, you can go back to the previous card by using this arrow.
<br>You can do this in both directions.
<br>
<br>Try changing the card this way.
    `,
    continueAfter: async () => {
        scrollTo(document.querySelector('#' + selectedCard.elem.id).card);

        async function closeScryfall(evt) {
            evt.data.location = window.location;
            await new Promise(resolve => setTimeout(resolve, 500));
            evt.data.close();
        }
        Events.on(Events.Type.ScryfallOpened, closeScryfall);

        await Tutorial.waitForEvent(Events.Type.CardChanged, () => {
            Events.remove(Events.Type.ScryfallOpened, closeScryfall);
            revertedCard = true;
        })
    },
    canSkip: () => revertedCard
});

Tutorial.addStep({
    getElement: () => document.querySelector('#card3'),
    getFrameElement: () => document.querySelector('#card3 .flipSvg'),
    text: `You can also flip two-sided cards by clicking on this arrow.`,
    continueAfter: async () => {
        scrollTo(document.querySelector('#card3').card);

        async function closeScryfall(evt) {
            evt.data.location = window.location;
            await new Promise(resolve => setTimeout(resolve, 500));
            evt.data.close();
        }
        Events.on(Events.Type.ScryfallOpened, closeScryfall);

        await Tutorial.waitForEvent(Events.Type.CardFlipped, () => {
            Events.remove(Events.Type.ScryfallOpened, closeScryfall);
            flippedCard = true;
        });
    },
    canSkip: () => flippedCard,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#searchButtons'),
    text: `Next, you can try the Filters.
<br>
<br>Here you can change the preferred frame type and/or 
<br>the style of the artwork (full or extended art).
<br>
<br>The filters are only as good as the data of Scryfall, 
<br>so there are often some cards in the wrong category.
`,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#searchButtons'),
    text: `
<br>Close the popup when you are done trying.
    `,
    continueAfter: async (evt) => {
        let cardElem = document.querySelector('#card1');
        scrollTo(cardElem.card);

        window.openScryfall(cardElem.card, evt);
        await Tutorial.waitForEvent(Events.Type.ScryfallClosed, () => triedFilters = true);
    },
    canSkip: () => triedFilters
});

Tutorial.addStep({
    getElement: () => document.querySelector('#artViewButton'),
    text: `Besides the InputView, there is the ArtView.
<br>
<br>Here you can see all the cards in a grid view.
<br>Editing a card works the same way as in the InputView.
<br>When you did not already load a deck, it will be loaded automatically.
<br>
<br>Take a look at the ArtView now.
`,
    continueAfter: () => Tutorial.waitForEvent(Events.Type.ViewChanged, () => { if (View.mode != View.Mode.ARTVIEW) throw new Error("ArtView not opened"); }),
    canSkip: () => View.mode == View.Mode.ARTVIEW,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#cards'),
    getFrameElement: () => document.querySelector('#tutorialContent'),
    text: 'Thank you!<br>Now have fun choosing artworks 😄',
});

// TODO create a tutorial for the PDF creation
// Pdf Options
//
// Pdf creation
//
//
//
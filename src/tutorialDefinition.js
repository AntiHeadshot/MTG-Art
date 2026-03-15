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
<br>You can start the tutorial again anytime, if you want. &#x1F44D;`,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#newDeckInput'),
    text: `Input your deck here. You can type or paste your deck list into this field. Each card should be on a new line and if no count is given, a single card is assumed.
<br>
<br>Your deck will be <b>automatically saved</b> and loaded again when you reload or revisit this site.
<br>Also missing tokens are fetched and added to the bottom of the list.
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
        return document.querySelector('#newDeckInput')
    },
    text: `We try to recognize every card.
<br>Set and the number of the card will be prioritized over the name.
<br>
<br>Entries like "1 Vampire" will be treated as unspecified as long as you do not change the card. So the search will return cards by name instead of the exact same card. Be careful to select the correct card you want.
<br>
<br>By pressing enter you can add another entry. (If you are inside an entry it will function like a line break.)
<br>By pressing control + D you can duplicate the current entry.
<br>The border will change from red to gray it a card could be read.
<br>
<br>You can switch to the next entry with tab or arrow down key.
<br>
<br>The card list shows the card you selected in the input field. Try this next.
`
});

Tutorial.addStep({
    getElement: () => document.querySelector('#newDeckInput'),
    text: 'Click on an entry for a card to scroll to its position',
    //todo unselect
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
        scrollToCard(document.querySelector('#' + selectedCard.elem.id).card,);

        await Tutorial.waitForEvent(Events.Type.CardChanged, () => {
            changedCard = true;
            if (popup) {
                popup.location = window.location;
                popup.close();
            }
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
        scrollToCard(document.querySelector('#' + selectedCard.elem.id).card);

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
    getElement: () => window.deck.find(c => c.twoFaced).elem,
    getFrameElement: () => window.deck.find(c => c.twoFaced).elem.querySelector('.flipSvg'),
    text: `You can also flip two-sided cards by clicking on this arrow.`,
    continueAfter: async () => {
        scrollToCard(document.querySelector('#card3').card);

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
    getElement: () => window.deck.find(c => c.twoFaced).elem,
    getFrameElement: () => window.deck.find(c => c.twoFaced).elem.querySelector('.printSettings'),
    text: `You can also hide one side of double sided cards from printing.
<br>
<br>This is not as relevant for normal cards, but may some times be advantagious, like on this "Anointed Procession" from SLD.
<br>
<br>(You can also hide any regular card from print.)
    `,
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
        let card = window.deck.find(c => !c.isUnset);
        scrollToCard(card);

        window.openScryfall(card, evt);
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
    getElement: () => document.querySelector('#tutorialContent'),
    text: `The ArtView funcions are exactly the same as the left side of the InputView.
<br>
<br>This way you can open this site on one side of your monitor and move the Scryfall window to the other side.
<br>As long as you do not close Scryfall, the same window will be reused.
`,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#pdfButton'),
    text: `At last there is the PdfView.
<br>
<br>Here you can create a printable PDF and modify the brightness of cards.
<br>
<br>Take a look at the PdfView now.
`,
    continueAfter: () => Tutorial.waitForEvent(Events.Type.ViewChanged, () => { if (View.mode != View.Mode.PDF) throw new Error("PdfView not opened"); }),
});

Tutorial.addStep({
    getElement: () => document.querySelector('#pdfInputs'),
    text: `Here you can edit some print settings. The preview will apply all changes immediatly.
<br>
<br>By clicking create the preview below will be converted to a PDF-Document. 
<br><b>This may take a while.</b>
<br>(I would recoment finishing the tutorial first!)
`,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#templateDisplay'),
    text: `Here you can see a preview of the page layout.
<br>This also is a svg path that can be used to cut the cards with appropriate machines.
`,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#pdfPreview'),
    text: `Here you can see a preview of the page.
<br>You can edit the brightness of single cards. (Two sided cards are on single card!)
<br>brighter - left click
<br>darker - right click
<br>reset - middle click
`,
});

Tutorial.addStep({
    getElement: () => document.querySelector('#pdfPreviewSettings'),
    text: 'Here You can edit the brightness of all cards at once.',
});

Tutorial.addStep({
    getElement: () => document.querySelector('#pdfContainer'),
    getFrameElement: () => document.querySelector('#tutorialContent'),
    text: 'Thank you!<br>Now have fun choosing artworks &#x1F604;',
});

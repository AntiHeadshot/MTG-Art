
let EventsType = Object.freeze({
    DeckLoading: "deckLoading",
    DeckLoaded: "deckLoaded",
    ViewChanged: "viewChanged",
    PdfCreated: "pdfCreated",
    PdfCreating: "pdfCreating",
    StorageChanged: "storageChanged",
    ScryfallOpened: "scryfallOpened",
    ScryfallClosed: "scryfallClosed",
    CardFlipped: "cardFlipped",
    CardChanged: "cardChanged",
    CardAdded: "cardAdded",
    CardRemoved: "cardRemoved",
    ScrollingToCard: "scrollingToCard",
    FilterChanged: "filterChanged",
    TutorialStarted: "tutorialStarted",
    TutorialEnded: "tutorialEnded",
    TokenAdded: "tokenAdded",
    TokenRemoved: "tokenRemoved",
    NeededTokensChanged: "neededTokensChanged",
    CardLoaded: "cardLoaded",
});

class Events {

    static get Type() { return EventsType; }

    static on(type, handler) { document.addEventListener(type, handler); }
    static remove(type, handler) { document.removeEventListener(type, handler); }
    static dispatch(type, data) { document.dispatchEvent(new MessageEvent(type, { data: data })); }
}

export default Events;
export { Events };
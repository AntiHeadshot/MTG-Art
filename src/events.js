
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
    ScrollingToCard: "scrollingToCard",
    FilterChanged: "filterChanged",
    TutorialStarted: "tutorialStarted",
    TutorialEnded: "tutorialEnded",
});

class Events {

    static get Type() { return EventsType; }

    static on(type, handler) { document.addEventListener(type, handler); }
    static remove(type, handler) { document.removeEventListener(type, handler); }
    static dispatch(type, data) { document.dispatchEvent(new MessageEvent(type, { data: data })); }
}

export default Events;
export { Events };